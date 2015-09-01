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
    GA.PLAYER_MAX_VELOCITY = 240;
    GA.PLAYER_RADIUS = 12;
    GA.PLAYER_MAX_HIT_POINTS = 3;
    GA.PLAYER_RECOVER_TIME = 10000;
    GA.PLAYER_INJURED_PENALTY = 0.33;
    GA.FRICTION = 2.0;
    GA.PLAYER_THRUST = 4 + GA.FRICTION;
    GA.SHOT_SPEED = 6;
    GA.SHOT_RETURN_SPEED = GA.SHOT_SPEED;
    GA.GATE_WIDTH = 64;
    GA.ENEMY_SPAWN_TIME = 4000; // millisecs
    GA.SINGLE_ENEMY_SPAWN_TIME = 10000; // millisecs
    GA.GATES_PER_WALL = 3;
    GA.NUM_DESIRED_ENEMIES = GA.GATES_PER_WALL;
    GA.BADDIE_DEATH_TIME = 450; // millisecs

    GA.GameState = function() {
        var GS = this;

        // Used for shot = "null", without having to check for safety
        GS.nullShot = {
            update: function() {},
            fired: false
        };

        GS.Shot = function(player, dir, time) {
            var S = this;
            this.x = player.x;
            this.y = player.y;
            this.player = player;

            this.h = GA.SHOT_SPEED * Math.sin(dir);
            this.v = -GA.SHOT_SPEED * Math.cos(dir);

            this.time = time;
        };
        GS.Shot.prototype = {
            fired: true,
            outgoing: true,
            paused: false,
            update: function(delta) {
                this.x += this.h;
                this.y += this.v;

                if (   this.x < 0
                    || this.x > GA.width
                    || this.y < 0
                    || this.y > GA.height) {

                    this.recall();

                    // FIXME: Ew. Special casing.
                    if (this.player == GS.player) {
                        // Player bullet hit a wall.
                        // First, check if we hit any gates.
                        var locked = false;
                        for (var i=0; i < GS.gates.length; ++i) {
                            if (GS.gates[i].checkCollision(this.x, this.y)) {
                                locked = true;
                                GS.gates[i].lock();
                                break;
                            }
                        }
                        if (!locked) createjs.Sound.play('knock');
                    }
                }
            },
            returnUpdate: function(delta) {
                // Swapped out for update() when returning.
                var dir = Math.atan2(this.player.x - this.x, this.player.y - this.y);
                this.x += GA.SHOT_RETURN_SPEED * Math.sin(dir);
                this.y += GA.SHOT_RETURN_SPEED * Math.cos(dir);

                // FIXME: this is appropriate for player, but...
                if (Math.abs(this.x - this.player.x) <= GA.PLAYER_RADIUS
                    && Math.abs(this.y - this.player.y) <= GA.PLAYER_RADIUS) {

                    if (this.player == GS.player)
                        createjs.Sound.play('slurp');
                    
                    if (this.destroy) this.destroy();
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
            this.open = false;
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
                if (!this.locked)
                    createjs.Sound.play('open');
                this.locked = true;
            }
          , closeUnlessLocked: function() {
                if (!this.locked) this.open = false;
            }
        };

        GS.BlockBaddie = function(x, y) {
            var BB = this;

            this.x = x;
            this.y = y;

            this.init();
        };
        GS.BlockBaddie.prototype = {
            width: 32
          , dying: false
          , killedTime: 0
          , speed: 70
          , minWaitChDir: 3000
          , maxWaitChDir: 5000
          , minWaitShot: 1000
          , maxWaitShot: 6000
          , maxRotatePerSec: Math.PI * 3/5
          , lance: 60  // Invisible lance that keeps baddies from steering into walls.
          , shot: GS.nullShot
          , init: function() {
                // Initial velocity is "out the gate".
                // We calculate the direction, "towards the center",
                // and then normalize it to exactly one of the four
                // basic compass points.
                //
                // (North is represented twice, so we can find "near"
                // when it's either close to 0, or close to 2 * PI.)
                var compass = [0,1,2,3,4].map(function(x) { return x * Math.PI/2; });
                this.dir = Math.atan2(GA.width/2 - this.x, GA.height/2 - this.y);
                if (this.dir < 0) {
                    this.dir = Math.PI * 2 + this.dir;
                }
                var dists = compass.map(function(x) { return Math.abs(x - this.dir); }, this);
                var minIdx = 0;
                var min = dists[0];
                for (var i=1; i != dists.length; ++i) {
                    if (dists[i] < dists[minIdx]) {
                        minIdx = i;
                        min = dists[i];
                    }
                }
                this.dir = this.desiredDir = compass[minIdx];
                // First direction change happens different range of
                // times than the rest.
                this.timeChDir = 500
                    + Math.random() * 1000
                this.timeFire = this.minWaitShot + Math.random() * (this.maxWaitShot - this.minWaitShot);

                this.h = this.speed * Math.sin(this.dir);
                this.v = this.speed * Math.cos(this.dir);
            }
          , update: function(delta) {
                this.x += this.h * (delta / 1000);
                this.y += this.v * (delta / 1000);
                var w = this.width/2 + 2;

                if (this.killedTime == 0) {
                    this.checkPlayerShot();

                    this.adjustDir(delta);

                    if (this.x < w) {
                        this.x = w;
                    }
                    else if (this.x > GA.width - w) {
                        this.x = GA.width - w;
                    }

                    if (this.y < w) {
                        this.y = w;
                    }
                    else if (this.y > GA.height - w) {
                        this.y = GA.height - w;
                    }

                    this.checkShot(delta);

                    this.shot.update();
                }
                else if (GS.gameTime - this.killedTime >
                         GA.BADDIE_DEATH_TIME) {
                    this.killMe();
                }
            }
          , checkShot: function(delta) {
                this.timeFire -= delta;
                if (GS.player.hitPoints == 0) {
                    // Can't shoot, can't collide bullets.
                }
                else if (this.shot.fired) {
                    // Check if our bullet hit the player!

                    if (this.shot.outgoing
                        && Math.abs(this.shot.x - GS.player.x) <= GA.PLAYER_RADIUS
                        && Math.abs(this.shot.y - GS.player.y) <= GA.PLAYER_RADIUS) {

                        // Hit!
                        GS.player.hit();
                        this.shot.recall();
                    }
                }
                else if (this.timeFire <= 0) {
                    var baddie = this;

                    // Fire a bullet.
                    var dir = Math.atan2(GS.player.x - this.x, this.y - GS.player.y);
                    // Add some noise, the enemies aren't fantastic
                    // shots.
                    var noiseRange = Math.PI / 4;
                    dir += Math.random() * noiseRange - noiseRange/2;
                    this.shot = new GS.Shot(this, dir, GS.gameTime);
                    createjs.Sound.play('shot');
                    this.shot.destroy = function() {
                        baddie.shot = GS.nullShot;
                        baddie.timeFire = baddie.minWaitShot + Math.random() * (baddie.maxWaitShot - baddie.minWaitShot);
                    };
                }
            }
          , adjustDir: function(delta) {
                var oldDir = this.dir;

                this.timeChDir -= delta;
                if (this.timeChDir < 0) {
                    // Choose random new desired direction and wait time
                    if (false) {
                        // original "randomize direction"
                        this.desiredDir = Math.random() * 2 * Math.PI;
                    }
                    else {
                        // new: pick a random location, and use the
                        // direction to there (expected to point us away
                        // from walls when we're near)
                        var rx = Math.random() * GA.width;
                        var ry = Math.random() * GA.height;
                        this.desiredDir = GA.normalizeRadians(Math.atan2(rx - this.x, ry - this.y));
                    }
                    this.timeChDir = this.minWaitChDir
                        + Math.random() * (this.maxWaitChDir - this.minWaitChDir);
                }
                // If our current direction isn't our desired direction,
                // then adjust.
                if (this.dir != this.desiredDir) {
                    var diff = GA.diffRadians(this.desiredDir, this.dir);
                    var maxRotate = this.maxRotatePerSec * delta/1000;
                    if (Math.abs(diff) <= maxRotate)
                        this.dir = this.desiredDir;
                    else if (diff < 0)
                        this.dir -= maxRotate;
                    else
                        this.dir += maxRotate;
                }

                this.adjustForLance();

                if (this.dir != oldDir) {
                    this.h = this.speed * Math.sin(this.dir);
                    this.v = this.speed * Math.cos(this.dir);
                }

                this.dir = GA.normalizeRadians(this.dir);
            }
          , adjustForLance: function() {
                // Redirect our direction whenever the "lance" hits a
                // wall.

                var xy = [ this.x, this.y ];
                var bxy = [ xy[0] + this.lance * Math.sin(this.dir), xy[1] + this.lance * Math.cos(this.dir) ];
                var bounds = [ GA.width, GA.height ];
                var t, u, e;
                var pm;
                var poss;
                var dirs, dists;
                var diff;

                if (bxy[0] < 0 || bxy[0] > bounds[0]) {
                    t = 0;
                    u = 1;
                    e = bxy[0] < 0? 0 : bounds[0];
                    if (bxy[1] < 0 || bxy[1] > bounds[1]) {
                        // We've just driven the lance into a corner.
                        // If the lance line is mainly pointing
                        // vertically, slide horizontally.
                        if (Math.abs(bxy[1] - xy[1]) > Math.abs(bxy[0] - xy[0])) {
                            t = 1;
                            u = 0;
                            e = bxy[1] < 0? 0: bounds[1];
                        }
                    }
                }
                else if (bxy[1] < 0 || bxy[1] > bounds[1]) {
                    t = 1;
                    u = 0;
                    e = bxy[1] < 0? 0 : bounds[1];
                }
                else {
                    // No bounds exceeded, nothing to adjust.
                    return;
                }

                // lance must remain a constant distance from baddie,
                // and inside the game area. We know where the new
                // bxy[t] position is: it's at whatever wall we touched. Now we
                // need good ol' Pythaggy to tell us where new bxy[u] is.
                //
                // (xy[t] - e)^2 + (xy[u] - bxy[u])^2 = this.lance^2
                // xy[u] - bxy[u] = +/- sqrt( this.lance^2 - (xy[t] - e)^2 )
                // - bxy[u] = +/- sqrt( this.lance^2 - (xy[t] - e)^2 ) - xy[u]
                // bxy[u] = xy[u] +/- sqrt( this.lance^2 - (xy[t] - e)^2 )
                pm = Math.sqrt((this.lance * this.lance) - (xy[t] - e) * (xy[t] - e));
                poss = [xy[u] - pm, xy[u] + pm];

                // Okay, so which of the +/- branch should we choose?
                // First, if one of them turns out to be out of bounds,
                // then it's ruled out.
                if (poss[0] < 0)
                    poss.splice(0, 1);
                else if (poss[1] > bounds[u])
                    poss.splice(1, 1);

                dirs = poss.map(function (x) {
                    return t == 0? Math.atan2(e - xy[t], x - xy[u])
                                 : Math.atan2(x - xy[u], e - xy[t]);
                });

                if (dirs.length > 1) {
                    // Okay, next, choose whichever branch brings us to
                    // the closest direction to the current one.
                    dists = dirs.map(function (x) {
                        return Math.abs(GA.diffRadians(this.dir, x));
                    }, this);

                    diff = dists[0] - dists[1];
                    if (Math.abs(diff) < 0.0001) {
                        // Both are equal; just pick one randomly.
                        this.dir = dirs[ Math.floor( 2 * Math.random() ) ];
                    }
                    else {
                        this.dir = dirs[ diff > 0? 1 : 0 ];
                    }
                }
                else {
                    this.dir = dirs[0];
                }
            }
          , checkPlayerShot: function() {
                if (!GS.shot.fired || !GS.shot.outgoing) return;

                var x = GS.shot.x;
                var y = GS.shot.y;

                if (x > this.x - this.width/2 &&
                    x < this.x + this.width/2 &&
                    y > this.y - this.width/2 &&
                    y < this.y + this.width/2) {

                    this.killedTime = GS.gameTime;
                    createjs.Sound.play('kill');
                }
            }
          , killMe: function() {
                for (var i=0; i < GS.enemies.length; ++i) {
                    if (GS.enemies[i] === this) {
                        GS.enemies.splice(i,1);
                        if (GS.enemies.length == 0) {
                            GS.spawnTime = GS.gameTime + GA.ENEMY_SPAWN_TIME;
                        }
                        else if (GS.spawnTime < GS.gameTime) {
                            GS.spawnTime = GS.gameTime + GA.SINGLE_ENEMY_SPAWN_TIME;
                        }
                        break;
                    }
                }
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
            Plyr.hitPoints = GA.PLAYER_MAX_HIT_POINTS;

            Plyr.update = function(delta) {
                if (Plyr.hitPoints == 0) {
                    // Keep going with momentum, ignore everything else
                    // (including walls)
                    Plyr.x += Plyr.h;
                    Plyr.y += Plyr.v;
                    return;
                }

                if (Plyr.hitPoints < GA.PLAYER_MAX_HIT_POINTS
                    && GS.gameTime - Plyr.injuredTime >= GA.PLAYER_RECOVER_TIME) {

                    Plyr.hitPoints++;
                    Plyr.injuredTime = GS.gameTime;
                }
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
                    var maxVeloc = GA.PLAYER_MAX_VELOCITY;
                    maxVeloc -= maxVeloc * GA.PLAYER_INJURED_PENALTY
                        * (GA.PLAYER_MAX_HIT_POINTS - Plyr.hitPoints);
                    if (newValue > maxVeloc * step) {
                        newValue = maxVeloc * step;
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

                var locked = false;
                if (bounced) {
                    // Double check we didn't just pass through a gate.
                    var portaled = false;

                    for (var i=0; i < GS.gates.length; ++i) {
                        var gate = GS.gates[i];
                        var j = (i + 6) % GS.gates.length; //opposing gate's index
                        if (gate.checkCollision(Plyr.x, Plyr.y)) {
                            locked = true;
                            gate.lock();
                            var og = GS.gates[j]; //opposing gate
                            if (og.open) {
                                og.lock();
                                newX = gate.opposingX;
                                newY = gate.opposingY;
                                newH = Plyr.h;
                                newV = Plyr.v;
                                portaled = true;
                                // Passing through a portal restores
                                // one's health.
                                Plyr.hitPoints = GA.PLAYER_MAX_HIT_POINTS;
                            }
                            break;
                        }
                    }

                    if (portaled) {
                        createjs.Sound.play('gate');
                    }
                    else if (!locked) {
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

            Plyr.hit = function() {
                if (--Plyr.hitPoints > 0) {
                    // FIXME: better sound?
                    createjs.Sound.play('unh');
                    Plyr.injuredTime = GS.gameTime;
                }
                else {
                    // Player death. :(
                    createjs.Sound.play('kill');
                    Plyr.killedTime = GS.gameTime;
                    GS.shot = GS.nullShot;
                }
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
            for (var i = 0; i < GS.enemies.length; ++i) {
                GS.enemies[i].update(delta);
            }
            GS.maybeSpawnEnemies();
        };

        GS.maybeSpawnEnemies = function() {
            if (GS.gameTime < GS.spawnTime) return;

            if (GS.enemies.length == 0) {
                // Spawning three enemies.

                GS.closeUnlockedGates();

                // Grab a random wall of gates.
                var numWalls = 4;
                var gateNum = Math.floor(Math.random() * numWalls)
                    * GA.GATES_PER_WALL;

                for (var i=gateNum; i < gateNum + GA.GATES_PER_WALL; ++i) {
                    GS.spawnEnemyAtGate(GS.gates[i]);
                }

                createjs.Sound.play('spawn');
            }
            else if (GS.enemies.length < GA.NUM_DESIRED_ENEMIES) {
                // Spawn one enemy.

                GS.closeUnlockedGates();

                // Wait a while more (if there are still enemies left to
                // spawn).
                GS.spawnTime = GS.gameTime + GA.SINGLE_ENEMY_SPAWN_TIME;

                GS.spawnEnemyAtGate(GS.gates[
                    Math.floor(GS.gates.length * Math.random()) ]);

                createjs.Sound.play('spawn');
            }
        };

        GS.closeUnlockedGates = function() {
            for (var i = 0; i < GS.gates.length; ++i) {
                GS.gates[i].closeUnlessLocked();
            }
        };

        GS.spawnEnemyAtGate = function(gate) {
            gate.open = true;

            GS.enemies.push(
                new GS.BlockBaddie(gate.x, gate.y)
            );
        };

        GS.fire = function() {
            if (GS.player.hitPoints == 0 || GS.paused)
                return;

            if (GS.shot.fired) {
                if (GS.shot.outgoing) {
                    GS.shot.recall();
                }
            }
            else {
                GS.shot = new GS.Shot(GS.player, GS.player.rot, GS.gameTime);
                GS.shot.destroy = function() {
                    // Returned to player; remove reference to self from from game state.
                    GS.shot = GS.nullShot;
                };
                createjs.Sound.play('shot');
            }
        };

        GS.player = new GS.Player();
        GS.shot = GS.nullShot;
        GS.gameTime = 0;
        GS.spawnTime = GA.ENEMY_SPAWN_TIME;
        GS.enemies = [];

        GS.gates = [];
        var gXOff = GA.width/4;
        var gYOff = GA.height/4;
        // Assumes GATES_PER_WALL is 3.
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
            'Space', GS.fire,
            'p', function() { GS.paused = !GS.paused; }
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
            if (state.player.hitPoints != 0)
                GG.drawShot(delta, state.shot, 'red');
            GG.drawPlayer(delta);
            for (var i=0; i < state.enemies.length; ++i) {
                GG.drawBaddie(state.enemies[i]);
                if (state.enemies[i] && !state.enemies[i].killedTime) {
                    GG.drawShot(delta, state.enemies[i].shot, 'rgba(0,0,128,0.45)');
                }
            }
        };

        GG.shadow = function() {
            GG.screen.shadowColor = 'rgba(0,0,0,0.3)';
            GG.screen.shadowOffsetX = 5;
            GG.screen.shadowOffsetY = 5;
            GG.screen.shadowBlur = 4.2;
        };

        GG.drawBaddie = function(baddie) {
            var scr = GG.screen;
            var x = baddie.x;
            var y = baddie.y;

            var hW = baddie.width / 2; // half of width
            var cRad = 8; // corners radii

            var alpha = 0.45;
            if (baddie.killedTime) {
                var maxHW = 80;
                var percent = (GG.state.gameTime - baddie.killedTime) /
                                    GA.BADDIE_DEATH_TIME;
                var oldHW = hW;
                hW = hW + (maxHW - hW) * percent;
                cRad *= hW / oldHW;
                alpha -= alpha * percent;
            }
            scr.fillStyle = 'rgba(0,0,128,' + alpha + ')';

            scr.beginPath();
            scr.moveTo(x-hW+cRad, y-hW);
            scr.lineTo(x+hW-cRad, y-hW); // T
            scr.arcTo(x+hW, y-hW, x+hW, y-hW+cRad, cRad); // TR
            scr.lineTo(x+hW, y+hW-cRad); // R
            scr.arcTo(x+hW, y+hW, x+hW-cRad, y+hW, cRad); // BR
            scr.lineTo(x-hW+cRad, y+hW); // B
            scr.arcTo(x-hW, y+hW, x-hW, y+hW-cRad, cRad); // BL
            scr.lineTo(x-hW, y-hW+cRad); // L
            scr.arcTo(x-hW, y-hW, x-hW+cRad, y-hW, cRad); // TL
            scr.save();
            if (!baddie.killedTime)
                GG.shadow();
            if (!baddie.shot.fired || baddie.killedTime)
                scr.fill();
            scr.restore();
            if (!baddie.killedTime) {
                scr.lineWidth = 2;
                scr.strokeStyle = 'black';
                scr.stroke();
            }

            if (!GA.debug) return;
            // lance line
            scr.beginPath();
            scr.moveTo(x, y);
            scr.lineTo(x + baddie.lance * Math.sin(baddie.dir), y + baddie.lance * Math.cos(baddie.dir));
            scr.lineWidth = 1;
            scr.strokeStyle = 'black';
            scr.stroke();

            // Arc to desiredDir
            scr.beginPath();
            var adj = Math.PI / 2;
            var diff = GA.diffRadians(baddie.desiredDir, baddie.dir)
            scr.arc(x, y, 40, -baddie.dir + adj, -baddie.desiredDir + adj, diff > 0);
            scr.lineWidth = 2;
            scr.strokeStyle = 'magenta';
            scr.stroke();
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

        GG.drawShot = function(delta, shot, style) {
            var scr = GG.screen;
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
            scr.fillStyle = style;
            scr.arc(shot.x, shot.y, r, 0, 2 * Math.PI);
            scr.save();
            GG.shadow();
            scr.fill();
            scr.restore();
        };

        GG.drawPlayer = function() {
            var p = GG.state.player;
            var s = GG.screen;
            if (p.hitPoints == 0 && GG.state.gameTime - p.killedTime > GA.BADDIE_DEATH_TIME)
                return;

            var r = GA.PLAYER_RADIUS;
            if (p.hitPoints == 0) {
                r += 20 * (GG.state.gameTime - p.killedTime) / GA.BADDIE_DEATH_TIME;
            }
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
            if (p.hitPoints == 0) {
                var percent = (GG.state.gameTime - p.killedTime) /
                                    GA.BADDIE_DEATH_TIME;
                var alpha = 1 - percent;
                s.fillStyle = 'rgba(128,0,0,' + alpha + ')';
                s.save();
                s.fill();
                s.restore();
            }
            else if (!GG.state.shot.fired) {
                s.save();
                GG.shadow();
                s.fill();
                s.restore();
                s.stroke();
            }
            else {
                GG.shadow();
                s.stroke();
            }
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
        createjs.Sound.registerSound("spawn.ogg", 'spawn');
        createjs.Sound.registerSound("open.ogg", 'open');
        createjs.Sound.registerSound("kill.ogg", 'kill');
        createjs.Sound.registerSound("unh.ogg", 'unh');

        GA.screen = document.getElementById('game').getContext('2d');
        GA.width = 640;
        GA.height = 480;

        GA.graphics = new GA.GameGraphics(GA.screen);
        GA.state = new GA.GameState();

        GA.framesPerSec = 50;
        GA.msecsPerFrame = 1000 / GA.framesPerSec;
        GA.maxMsecsPerFrame = 2 * GA.msecsPerFrame;

        GA.now = new Date();
        GA.update();
    };

    GA.update = function() {
        var now = new Date();
        var delta = now - GA.now;
        if (delta > GA.maxMsecsPerFrame)
            delta = GA.maxMsecsPerFrame;
        GA.now = now;

        MajicKeys.pulse();
        if (!GA.state.paused)
            GA.state.update(delta);
        GA.graphics.update(GA.state, delta);

        window.setTimeout(GA.update, GA.msecsPerFrame);
    };

    GA.normalizeRadians = function(x) {
        // Take a degree in radians, and force it to the range 0 - 2pi
        if (x < 0) {
            return 2 * Math.PI + (x % (2 * Math.PI));
        }
        else {
            return x % (2 * Math.PI);
        }
    };

    GA.diffRadians = function(a, b) {
        // Return the diff between a and b, with an absolute value < pi.
        a = GA.normalizeRadians(a);
        b = GA.normalizeRadians(b);
        var diff = a - b;
        if (diff < -Math.PI)
            return diff + 2 * Math.PI;
        else if (diff > Math.PI)
            return diff - 2 * Math.PI;
        else
            return diff;
    };
})();

window.addEventListener('load', GateArena.init);
