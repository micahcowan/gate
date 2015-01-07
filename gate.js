"use strict";

var MajicKeys = new (function() {
    var MK = this;

    MK.connections = {};
    MK.downs = {};
    MK.ups = {};
    MK.keys = {};

    MK.connect = function() {
        var alen = arguments.length;
        if (alen % 2 == 1) { --alen; }
        for (var i=0; i < alen; i += 2) {
            var key = arguments[i];
            var fn = arguments[i+1];

            MK.connections[key] = fn;
        }
    };

    MK.onDown = function() {
        var alen = arguments.length;
        if (alen % 2 == 1) { --alen; }
        for (var i=0; i < alen; i += 2) {
            var key = arguments[i];
            var fn = arguments[i+1];

            MK.downs[key] = fn;
        }
    };

    MK.onUp = function() {
        var alen = arguments.length;
        if (alen % 2 == 1) { --alen; }
        for (var i=0; i < alen; i += 2) {
            var key = arguments[i];
            var fn = arguments[i+1];

            MK.ups[key] = fn;
        }
    };

    MK.handleKeyDown = function(e) {
        var keys = MK.getKeys(e);

        for (var i = 0; i < keys.length; ++i) {
            var k = keys[i]
            MK.keys[k] = 1;
            if (MK.downs[k] !== undefined) MK.downs[k](e);
        }

        MK.maybeContinue(keys, e);
    };

    MK.handleKeyUp = function(e) {
        var keys = MK.getKeys(e);

        for (var i = 0; i < keys.length; ++i) {
            var k = keys[i]
            delete MK.keys[k]
            if (MK.ups[k] !== undefined) MK.ups[k](e);
        }

        MK.maybeContinue(keys, e);
    };

    MK.maybeContinue = function(key, e) {
        if (!(e.altKey || e.ctrlKey || e.metaKey)) {
            e.preventDefault();
        }
    };

    MK.getKeys = function(e) {
        // TODO: This needs lots of testing to handle various key event
        // paradigms.
        var key;
        if (e.key !== undefined) {
            key = e.key;
        }
        else if (e.keyIdentifier !== undefined) {
            key = e.keyIdentifier;
            if (key.substr(0,4) == "U+00" && key.length == 6) {
                key = String.fromCharCode(("0x" + key.substr(4,2)) - 0);
            }
        }

        var keys = [];
        if (key == ' ' || key == 'Space') {
            keys.push(' ');
            keys.push('Space');
        }
        else if (key == 'Up' || key == 'Down' || key == 'Left'
                 || key == 'Right') {
            keys.push('Arrow' + key);
        }
        else if (key.length == 1 && key.toLowerCase() != key.toUpperCase()) {
            keys.push(key.toLowerCase());
            keys.push(key.toUpperCase());
        }
        else {
            keys.push(key);
        }
        return keys;
    };

    MK.pulse = function(e) {
        for (var key in MK.keys) {
            var conn = MK.connections[key];
            if (conn !== undefined && conn !== null) {
                conn(e);
            }
        }
    };

    window.addEventListener('keydown', MK.handleKeyDown);
    window.addEventListener('keyup', MK.handleKeyUp);
})();

var GateArena = new (function() {
    var GA = this;

    GA.PLAYER_ROTATE_SPEED = Math.PI;
    GA.PLAYER_MAX_VELOCITY = 6;
    GA.PLAYER_RADIUS = 8;
    GA.FRICTION = 2.0;
    GA.PLAYER_THRUST = 4 + GA.FRICTION;
    GA.SHOT_SPEED = 6;
    GA.SHOT_RETURN_SPEED = 4;
    GA.GATE_WIDTH = 64;

    GA.GameState = function() {
        var GS = this;

        // Used for shot = "null", without having to check for safety
        GS.nullShot = {
            update: function() {},
            fired: false
        };

        GS.Shot = function(player, time) {
            var S = this;
            this.x = player.x;
            this.y = player.y;

            // XXX For now. Later we'll just use the direction, and a
            // constant speed, not based on player's.
            var dir = player.rot;
            this.h = GA.SHOT_SPEED * Math.sin(dir);
            this.v = -GA.SHOT_SPEED * Math.cos(dir);

            this.time = time;
        };
        GS.Shot.prototype = {
            fired: true,
            outgoing: true,
            update: function(delta) {
                this.x += this.h;
                this.y += this.v;

                if (   this.x < 0
                    || this.x > GA.width
                    || this.y < 0
                    || this.y > GA.height) {

                    // Player bullet hit a wall.
                    // First, check if we hit any gates.
                    for (var i=0; i < GS.gates.length; ++i) {
                        if (GS.gates[i].checkCollision(this.x, this.y)) {
                            GS.gates[i].lock();
                            break;
                        }
                    }
                    createjs.Sound.play('knock');
                    this.recall();
                }
            },
            returnUpdate: function(delta) {
                // Swapped out for update() when returning.
                var dir = Math.atan2(GS.player.x - this.x, GS.player.y - this.y);
                this.x += GA.SHOT_RETURN_SPEED * Math.sin(dir);
                this.y += GA.SHOT_RETURN_SPEED * Math.cos(dir);

                if (Math.abs(this.x - GS.player.x) <= GA.PLAYER_RADIUS
                    && Math.abs(this.y - GS.player.y) <= GA.PLAYER_RADIUS) {

                    createjs.Sound.play('slurp');
                    
                    // Returned to player; remove reference to self from state.
                    GS.shot = GS.nullShot;
                }
            },
            recall: function(delta) {
                // Shot being recalled to ship.
                this.time = GS.gameTime;
                this.update = this.returnUpdate;
                this.outgoing = false;
            },
        };

        GS.Gate = function(x, y) {
            this.x = x;
            this.y = y;
            this.open = true;
            this.locked = false;

            this.opposingX = x;
            this.opposingY = y;
            if (x == 0) {
                this.opposingX = GA.width;
            }
            else if (x == GA.width) {
                this.opposingX = 0;
            }
            else if (y == 0) {
                this.opposingY = GA.height;
            }
            else if (y == GA.height) {
                this.opposingY = 0;
            }
        };
        GS.Gate.prototype = {
            checkCollision: function(x, y) {
                if (!this.open) return false;
                if (this.x == 0) {
                    return (x <= this.x
                            && y > this.y - GA.GATE_WIDTH/2
                            && y < this.y + GA.GATE_WIDTH/2);
                }
                else if (this.x == GA.width) {
                    return (x >= this.x
                            && y > this.y - GA.GATE_WIDTH/2
                            && y < this.y + GA.GATE_WIDTH/2);
                }
                else if (this.y == 0) {
                    return (y <= this.y
                            && x > this.x - GA.GATE_WIDTH/2
                            && x < this.x + GA.GATE_WIDTH/2);
                }
                else if (this.y == GA.height) {
                    return (y >= this.y
                            && x > this.x - GA.GATE_WIDTH/2
                            && x < this.x + GA.GATE_WIDTH/2);
                }
            }
          , lock: function() {
                this.locked = true;
            }
        };

        GS.Player = function() {
            var Plyr = this;
            Plyr.x = 320;
            Plyr.y = 240;
            Plyr.h = 0;
            Plyr.v = 0;
            Plyr.rot = 0;
            Plyr.rotDir = 0;
            Plyr.thrust = 0;
            Plyr.thrustDir = 0;

            Plyr.update = function(delta) {
                var rd = Plyr.rotDir;
                var step = delta/1000.0;
                Plyr.rot += rd * GA.PLAYER_ROTATE_SPEED * step;

                Plyr.h += Plyr.thrust * step * GA.PLAYER_THRUST * Math.sin(Plyr.rot + Plyr.thrustDir);
                Plyr.v -= Plyr.thrust * step * GA.PLAYER_THRUST * Math.cos(Plyr.rot + Plyr.thrustDir);
                // What's the total speed now?
                var value = Math.sqrt(Math.abs(Plyr.h * Plyr.h) + Math.abs(Plyr.v * Plyr.v));
                var newValue = value - GA.FRICTION * step;
                if (newValue > 0) {
                    // Apply friction.
                    // Apply max;
                    if (newValue > GA.PLAYER_MAX_VELOCITY) {
                        newValue = GA.PLAYER_MAX_VELOCITY;
                    }
                    var scale = newValue / value;
                    Plyr.h *= scale;
                    Plyr.v *= scale;
                } else {
                    Plyr.h = 0;
                    Plyr.v = 0;
                }

                Plyr.x += Plyr.h;
                Plyr.y += Plyr.v;

                // Handle bouncing.
                var bounced = false;
                var newX = Plyr.x;
                var newY = Plyr.y;
                var newH = Plyr.h;
                var newV = Plyr.v;
                if (Plyr.x < 0) {
                    bounced = true;
                    newX = -Plyr.x;
                    newH = -Plyr.h;
                }
                else if (Plyr.x > GA.width) {
                    bounced = true;
                    newX -= 2 * (Plyr.x - GA.width);
                    newH = -Plyr.h;
                }

                if (Plyr.y < 0) {
                    bounced = true;
                    newY = -Plyr.y;
                    newV = -Plyr.v;
                }
                else if (Plyr.y > GA.height) {
                    bounced = true;
                    newY -= 2 * (Plyr.y - GA.height);
                    newV = -Plyr.v;
                }

                if (bounced) {
                    // Double check we didn't just pass through a gate.
                    var portaled = false;

                    for (var i=0; i < GS.gates.length; ++i) {
                        var gate = GS.gates[i];
                        var j = (i + 6) % GS.gates.length; //opposing gate's index
                        if (gate.checkCollision(Plyr.x, Plyr.y)) {
                            gate.lock();
                            var og = GS.gates[j]; //opposing gate
                            if (og.open) {
                                og.lock();
                                newX = gate.opposingX;
                                newY = gate.opposingY;
                                newH = Plyr.h;
                                newV = Plyr.v;
                                portaled = true;
                            }
                            break;
                        }
                    }

                    if (portaled) {
                        createjs.Sound.play('gate');
                    }
                    else {
                        createjs.Sound.play('bounce');
                    }

                    Plyr.x = newX;
                    Plyr.y = newY;
                    Plyr.h = newH;
                    Plyr.v = newV;
                }

                Plyr.rotDir = 0;
                Plyr.thrust = 0;
                Plyr.thrustDir = 0;
            };

            Plyr.rotateLeft = function(e) {
                Plyr.rotDir = -1;
            };

            Plyr.rotateRight = function(e) {
                Plyr.rotDir = 1;
            };

            Plyr.doThrust = function(e) {
                Plyr.thrust = 1;
            };

            Plyr.doReverse = function(e) {
                Plyr.thrust = 1;
                Plyr.thrustDir = Math.PI;
            };

            Plyr.moveLeft = function(e) {
                Plyr.thrust = 1;
                Plyr.thrustDir = -Math.PI/2
            };

            Plyr.moveRight = function(e) {
                Plyr.thrust = 1;
                Plyr.thrustDir = Math.PI/2
            };
        };

        GS.update = function(delta) {
            GS.gameTime += delta;
            GS.player.update(delta);
            GS.shot.update(delta);
        };

        GS.fire = function() {
            if (GS.shot.fired) {
                if (GS.shot.outgoing) {
                    GS.shot.recall();
                }
            }
            else {
                GS.shot = new GS.Shot(GS.player, GS.gameTime);
                createjs.Sound.play('shot');
            }
        };

        GS.player = new GS.Player();
        GS.shot = GS.nullShot;
        GS.gameTime = 0;

        GS.gates = [];
        var gXOff = GA.width/4;
        var gYOff = GA.height/4;
        var gPos = [
            [
                  [gXOff, 2*gXOff, 3*gXOff]
                , [0]
            ]
          , [
                  [GA.width]
                , [gYOff, 2*gYOff, 3*gYOff]
            ]
          , [
                  [gXOff, 2*gXOff, 3*gXOff]
                , [GA.height]
            ]
          , [
                  [0]
                , [gYOff, 2*gYOff, 3*gYOff]
            ]
        ];
        for (var i=0; i < gPos.length; ++i) {
            var comb = gPos[i];
            var xs = comb[0];
            var ys = comb[1];
            for (var j=0; j < xs.length; ++j) {
                for (var k=0; k < ys.length; ++k) {
                    GS.gates.push(new GS.Gate(xs[j], ys[k]));
                }
            }
        }

        MajicKeys.connect(
            'a', GS.player.rotateLeft,
            'd', GS.player.rotateRight,
            'w', GS.player.doThrust,
            's', GS.player.doReverse,
            'ArrowLeft', GS.player.rotateLeft,
            'ArrowRight', GS.player.rotateRight,
            'ArrowUp', GS.player.doThrust,
            'ArrowDown', GS.player.doReverse,
            'q', GS.player.moveLeft,
            'e', GS.player.moveRight
        );
        MajicKeys.onDown(
            'Space', GS.fire
        );
    };

    GA.GameGraphics = function(_scr) {
        var GG = this;
        GG.screen = _scr;

        GG.update = function(state, delta) {
            GG.state = state;
            GG.drawBackground(delta);
            for (var i=0; i < state.gates.length; ++i) {
                GG.drawGate(state.gates[i]);
            }
            GG.drawShot(delta);
            GG.drawPlayer(delta);
        };

        GG.shadow = function() {
            GG.screen.shadowColor = 'rgba(0,0,0,0.3)';
            GG.screen.shadowOffsetX = 5;
            GG.screen.shadowOffsetY = 5;
            GG.screen.shadowBlur = 7;
        };

        GG.drawGate = function(gate) {
            if (!gate.open) return;

            var scr = GG.screen;

            var x = gate.x;
            var y = gate.y;

            var w = GA.GATE_WIDTH;
            var x0 = x - w/2;
            var y0 = y - w/2;
            var r = 3;
            var rSpeed = gate.locked? 1000 : 500; //msecs
            var r2 = w * 0.5;
            var minStop = 0.5;
            var maxStop = 1.0;

            var slide = Math.abs(GG.state.gameTime % (rSpeed * 2) - rSpeed) / rSpeed;
            var stop = minStop + (maxStop - minStop) * slide;

            /*
            var grad = scr.createRadialGradient(
                x0 + w/2,
                -8,
                r,
                x0 + w/2,
                -2,
                r2);
                */
            var grad = scr.createRadialGradient(
                x,
                y,
                r,
                x,
                y,
                r2);

            var color1 = 'rgb(128,226,240)';
            var color2 = 'rgba(128,226,240,0)'
            if (gate.locked) {
                color1 = 'rgb(0,220,180)';
                color2 = 'rgba(0,220,180,0)'
            }
            grad.addColorStop(0, color1);
            grad.addColorStop(stop, color2);
            //grad.addColorStop(1, 'red');

            scr.fillStyle = grad;
            //scr.fillStyle = 'red';
            scr.fillRect(x0, y0, w, w);
        };

        GG.drawBackground = function(delta) {
            GG.screen.fillStyle = "#EEE";
            GG.screen.fillRect(0, 0, GG.screen.canvas.width, GG.screen.canvas.height);

            // Draw grid.
            var gridSize = 42;
            var moveSpeed = gridSize / 4.0;
            var offset = (new Date() / 1000) * moveSpeed % gridSize;

            GG.screen.lineWidth = 1;
            GG.screen.strokeStyle = "#C0C0D0";

            var s = GG.screen;
            var width = s.canvas.width;
            var height = s.canvas.height;
            for (var x = offset; x < width; x += gridSize) {
                s.beginPath();
                s.moveTo(x,0);
                s.lineTo(x,height);
                s.stroke();
            }
            for (var y = offset; y < height; y += gridSize) {
                s.beginPath();
                s.moveTo(0,y);
                s.lineTo(width,y);
                s.stroke();
            }
        };

        GG.drawShot = function(delta) {
            var scr = GG.screen;
            var shot = GG.state.shot;
            if (!shot.fired) return;

            var r = 4; // default bullet radius.
            var maxR = 7; // max bullet radius.
            var shrinkT = 333; // Time (msecs) it takes to shrink from max to default

            var slide = 0;
            if (GG.state.gameTime - shot.time < shrinkT) {
                slide = (GG.state.gameTime - shot.time)/shrinkT;
                if (shot.outgoing) {
                    r += (1.0 - slide) * (maxR - r);
                }
                else {
                    r += slide * (maxR - r);
                }
            }
            else if (!shot.outgoing) {
                r = maxR;
            }

            scr.beginPath();
            scr.fillStyle = "red";
            scr.arc(shot.x, shot.y, r, 0, 2 * Math.PI);
            scr.save();
            GG.shadow();
            scr.fill();
            scr.restore();
        };

        GG.drawPlayer = function() {
            var p = GG.state.player;
            var s = GG.screen;
            var r = 10;
            s.beginPath();
            var x0 = 0;
            var y0 = - r * 4/3;
            var x1 = + r * Math.sin(2/3 * Math.PI);
            var y1 = - r * Math.cos(2/3 * Math.PI);
            var x2 = + r * Math.sin(4/3 * Math.PI);
            var y2 = - r * Math.cos(4/3 * Math.PI);
            s.save();
            s.translate(p.x, p.y);
            s.rotate(p.rot);
            s.moveTo(x0, y0);
            s.bezierCurveTo(x0, y0, x1, y1-r*3/4, x1, y1+r/3);
            s.bezierCurveTo(x1, y1, x2, y2, x2, y2+r/3);
            s.bezierCurveTo(x2, y2-r*3/4, x0, y0, x0, y0);
            s.strokeStyle = "black";
            s.lineWidth = 2;
            s.lineJoin = "miter";
            s.fillStyle = "red";
            if (!GG.state.shot.fired) {
                s.save();
                GG.shadow();
                s.fill();
                s.restore();
            }
            else {
                GG.shadow();
            }
            s.stroke();
            s.restore();
        };
    };

    // GateArena functions
    GA.init = function() {
        createjs.Sound.registerSound("shot.ogg", 'shot');
        createjs.Sound.registerSound("clink.ogg", 'bounce');
        createjs.Sound.registerSound("gate.ogg", 'gate');
        createjs.Sound.registerSound("knock.ogg", 'knock');
        createjs.Sound.registerSound("slurp.ogg", 'slurp');

        GA.screen = document.getElementById('game').getContext('2d');
        GA.width = 640;
        GA.height = 480;

        GA.graphics = new GA.GameGraphics(GA.screen);
        GA.state = new GA.GameState();

        GA.framesPerSec = 50;
        GA.msecsPerFrame = 1000 / GA.framesPerSec;

        GA.now = new Date();
        GA.update();
    };

    GA.update = function() {
        var now = new Date();
        var delta = now - GA.now;
        GA.now = now;

        MajicKeys.pulse();
        GA.state.update(delta);
        GA.graphics.update(GA.state, delta);

        window.setTimeout(GA.update, GA.msecsPerFrame);
    };
})();

window.addEventListener('load', GateArena.init);
