"use strict";

var MajicKeys = new (function() {
    var MK = this;

    MK.connections = {};
    MK.keys = {};

    MK.connect = function() {
        var alen = arguments.length;
        if (alen % 2 == 1) { --alen; }
        for (var i=0; i < alen; i += 2) {
            var key = arguments[i];
            var fn = arguments[i+1];

            MK.connections[key] = fn;
        }

        window.addEventListener('keydown', MK.handleKeyDown);
        window.addEventListener('keyup', MK.handleKeyUp);
    };

    MK.handleKeyDown = function(e) {
        var key = MK.getKey(e);
        var conn = MK.connections[key];
        MK.keys[key] = 1;
        if (key.length == 1) {
            MK.keys[key.toLowerCase()] = 1;
            MK.keys[key.toUpperCase()] = 1;
        }
    };

    MK.handleKeyUp = function(e) {
        var key = MK.getKey(e);
        var conn = MK.connections[key];
        delete MK.keys[key];
        if (key.length == 1) {
            delete MK.keys[key.toLowerCase()];
            delete MK.keys[key.toUpperCase()];
        }
    };

    MK.getKey = function(e) {
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
        return key;
    };

    MK.pulse = function(e) {
        for (var key in MK.keys) {
            var conn = MK.connections[key];
            if (conn !== undefined && conn !== null) {
                conn(e);
            }
        }
    };
})();

var GateArena = new (function() {
    var GA = this;

    GA.PLAYER_ROTATE_SPEED = Math.PI;
    GA.PLAYER_MAX_VELOCITY = 6;
    GA.FRICTION = 2.0;
    GA.PLAYER_THRUST = 4 + GA.FRICTION;

    GA.GameState = function() {
        var GS = this;

        GS.player = new GA.Player();
        GS.gameTime = 0;

        MajicKeys.connect(
            'a', GS.player.rotateLeft,
            'd', GS.player.rotateRight,
            'w', GS.player.doThrust,
            's', GS.player.doReverse,
            'q', GS.player.moveLeft,
            'e', GS.player.moveRight
        );

        GS.update = function(delta) {
            GS.gameTime += delta;
            GS.player.update(delta);
        };
    };

    GA.Player = function() {
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
            if (Plyr.x < 0) {
                Plyr.x = -Plyr.x;
                Plyr.h = -Plyr.h;
            }
            else if (Plyr.x > GA.screen.canvas.width) {
                Plyr.x -= 2 * (Plyr.x - GA.screen.canvas.width);
                Plyr.h = -Plyr.h;
            }

            if (Plyr.y < 0) {
                Plyr.y = -Plyr.y;
                Plyr.v = -Plyr.v;
            }
            else if (Plyr.y > GA.screen.canvas.height) {
                Plyr.y -= 2 * (Plyr.y - GA.screen.canvas.height);
                Plyr.v = -Plyr.v;
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

    GA.GameGraphics = function(_scr) {
        var GG = this;
        GG.screen = _scr;

        GG.update = function(state, delta) {
            GG.state = state;
            GG.drawBackground(delta);
            GG.drawPlayer(delta);
        };

        GG.drawBackground = function(delta) {
            GG.screen.fillStyle = "silver";
            GG.screen.fillRect(0, 0, GG.screen.canvas.width, GG.screen.canvas.height);

            // Draw grid.
            var gridSize = 42;
            var moveSpeed = gridSize / 4.0;
            var offset = (GG.state.gameTime / 1000) * moveSpeed % gridSize;

            GG.screen.lineWidth = 1;
            GG.screen.strokeStyle = "gray";
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
            s.fill();
            s.stroke();
            s.restore();
        };
    };

    // GateArena functions
    GA.init = function() {
        GA.screen = document.getElementById('game').getContext('2d');

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
