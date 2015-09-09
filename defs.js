"use strict";

(function() {
    var GA = (window.GateArena = window.GateArena || {});

    var U = MajicUnits;

    var spritePrototype = MajicGame.spritePrototype;

    //// Classes ////

    // class Text:
    // automatically select the appropriate text message
    // based on browser language preferences (if available).
    GA.Text = function(msgs) {
        this.msgs = msgs;
    };
    GA.Text.prototype = new (function() {
        this.toString = this.toLocaleString = function() {
            if (this.selectedText !== undefined)
                return this.selectedText;
            var langs = ['en-US'];
            if (window.navigator && window.navigator.languages) {
                langs = window.navigator.languages;
            }
            for (var i = 0; i != langs.length; ++i) {
                if (this.msgs[langs[i]] !== undefined)
                    return this.selectedText = this.msgs[langs[i]];
            }
            for (var i = 0; i != langs.length; ++i) {
                var gen = langs[i];
                gen = gen[0] + gen[1];
                if (this.msgs[gen] !== undefined)
                    return this.selectedText = this.msgs[gen];
            }
        };
    })();

    //// Classes: GateArena-specific MajicGame sprite classes ////

    // Message: text-drawing sprite.
    GA.Message = function(msg, info) {
        this.text = msg;

        this.mergeData(GateArena.game.center);

        if (info.size !== undefined)
            this.size = info.size;

        this.draw = GA.art.drawMessage;
    };
    GA.Message.prototype = spritePrototype;

    GA.EnemyGroup = function() {
    };
    GA.EnemyGroup.prototype = [];

    GA.GateGroup = function() {
        var rect = [{x: 0}, {x: GA.game.width.as( U.pixels )},
                    {y: 0}, {y: GA.game.height.as( U.pixels )}]
        var NUM_WALLS = rect.length; // == 4, duh

        for (var i=0; i != NUM_WALLS; ++i) {
            var list = [];
            for (var j=0; j != 3; ++j) {
                // We push one x and two ys, or one y and two xs.
                // Whichever one there's one of, that's a fixed axis.
                // The other represents a range between the two values,
                // and gates will be interspersed evenly across it.
                list.push( rect[(i+j) % 4] );
            }
            this.push( new GA.GateWall(list) );
        }

        // Set up opposing-gate info. The first and last wall oppose,
        // and the two in the middle.
        for (var i=0; i < NUM_WALLS; i+=2) {
            var wall = this[(i+1) % NUM_WALLS];
            var oppose = this[(i+2) % NUM_WALLS];
            for (var j=0; j != wall.length; ++j) {
                wall[j].opposingGate = oppose[j];
                oppose[j].opposingGate = wall[j];
            }
        }

        // XXX open some gates opposing, some not
        var toggle = true;
        for (var i=0; i < NUM_WALLS; i++) {
            var wall = this[i];
            for (var j=0; j != wall.length; ++j) {
                var open;
                if (i % 3 == 0)
                    open = (toggle = !toggle);
                else
                    open = true;
                wall[j].open = open;
            }
        }
    };
    GA.GateGroupProtoClass = function() {
        this.getCollidingGate = function(obj) {
            var gate;
            // for each wall:
            for (var i=0; !gate && i != this.length; ++i) {
                gate = this[i].getCollidingGate(obj);
                if (gate) return gate;
            }
            return;
        };
    };
    GA.GateGroupProtoClass.prototype = [];
    GA.GateGroup.prototype = new GA.GateGroupProtoClass;

    GA.GateWall = function(args) {
        var GATES_PER_WALL = 3;
        var info = {x: [], y: []};
        var gate = this;
        args.forEach(function(obj){
            for (var name in obj) {
                info[name].push(obj[name]);
            }
        });
        var fixed = 'x', range = 'y';
        if (info.x.length == 2) {
            fixed = 'y'; range = 'x';
        }
        var spaceBetween = info[range][1] / (GATES_PER_WALL + 1);
        for (var gnum = 0; gnum != GATES_PER_WALL; ++gnum) {
            var gateInfo = {};
            gateInfo[fixed] = U.pixels( info[fixed][0] );
            gateInfo[range] = U.pixels( info[range][0] + (spaceBetween * (gnum + 1)) );
            gate.push( new GA.sprites.Gate( gateInfo ) );
        }
    };
    GA.GateWallProtoClass = function() {
        this.getCollidingGate = function(obj) {
            // for each gate
            for (var i=0; i != this.length; ++i) {
                var gate = this[i];
                if (gate.collidesWith(obj))
                    return gate;
            }
            return;
        };
    };
    GA.GateWallProtoClass.prototype = [];
    GA.GateWall.prototype = new GA.GateWallProtoClass;

    GA.GateProtoClass = function() {
        this.collidesWith = function(obj) {
            var range = this.size.as( U.pixel ) / 2;
            var x = this.x.as( U.pixel );
            var y = this.y.as( U.pixel );
            var ox = obj.x.as( U.pixel );
            var oy = obj.y.as( U.pixel );
            return (Math.abs( ox - x ) < range
                    && Math.abs( oy - y ) < range);
        };
        this.lock = function() {
            this.locked = true;
        }
    };

    GA.Background = function() {
        this.draw = GA.art.drawBackground;
    };
    GA.Background.prototype = spritePrototype;

    GA.BulletProtoClass = function() {
        // bullet states (not exposed, except via property accessors)
        var AT_REST = 0;   // held by owner, not doing anything
        var FIRED   = 1;   // en route from owner
        var RECALL  = 2;   // homing back in on owner

        this.state = AT_REST;

        Object.defineProperties(this, {
            isAtRest: {'get': function() {
                return this.state == AT_REST;
            }}
          , isFired: {'get': function() {
                return this.state == FIRED;
            }}
          , isReturning: {'get': function() {
                return this.state == RECALL;
            }}
        });

        this.fire = function(x, y, dir) {
            this.x = x.mul(1);
            this.y = y.mul(1);
            dir = dir.as( U.radian );
            this.h = this.speed.mul( Math.sin(dir) );
            this.v = this.speed.mul( -Math.cos(dir) );
            this.state = FIRED;
            this.firedTime = GA.game.timeElapsed;
            if (this.onFire)
                this.onFire.call(this);
        };

        this.recall = function() {
            if (this.state == FIRED)
                this.firedTime = GA.game.timeElapsed;
            this.state = RECALL;
        };

        this.rest = function() {
            this.state = AT_REST;
        };
    };

    //// Callback functions
    GA.maybeLockGate = function() {
        var gate = GA.state.gates.getCollidingGate(this);
        if (gate && gate.open) {
            gate.lock();
            createjs.Sound.play('open');
            return false; // Cancel sound playing
        }
        return true;
    };
    GA.maybeTeleportGate = function() {
        var gate = GA.state.gates.getCollidingGate(this);
        if (gate && gate.open) {
            gate.lock();
            var opposing = gate.opposingGate;
            if (opposing.open) {
                opposing.lock();
                createjs.Sound.play('gate');
                this.x = opposing.x.mul(1);
                this.y = opposing.y.mul(1);
                return false;
            }
            createjs.Sound.play('open');
        } else {
            createjs.Sound.play('bounce')
        }
        return true;
    };

    //// Behaviors: GateArena custom sprite behaviors

    GA.behavior = {
        // behavior to support a player trigger, firing a bullet.
        // Bullet's behavior isn't added to the game sprites; it's managed
        // here (bullet art is drawn during player draw, as well).
        playerBullet: function(data) {
            var owner = null; // set first time behavior runs
            var bullet = null;

            // Register keypress handling
            var trigger = data.trigger;
            var triggered = false;
            var mk = new MajicKeys;
            var fire = function(ev) {
                triggered = true;
            };
            mk.onDown(data.trigger, fire);

            var behavior = function(delta) {
                if (!owner) {
                    owner = this;
                    bullet = owner.bullet = new GA.sprites.Bullet(owner, data);
                }

                if (triggered) {
                    triggered = false;
                    if (bullet.isAtRest) {
                        bullet.fire(owner.x, owner.y, owner.rot);
                    }
                    else if (bullet.isFired) {
                        bullet.recall();
                    }
                    // else it's returning, and trigger doesn't do a thing.
                }

                GA.game.behaveAll(delta, [bullet]);
            };
            return behavior;
        }
      , bulletFiredBehavior: function(delta) {
            if (!this.isFired) return;
            this.x = this.x.add( this.h.mul(delta) );
            this.y = this.y.add( this.v.mul(delta) );
        }
      , bulletBoundsRecall: function(width, height) {
            return function(delta) {
                if (!this.isFired) return;
                var x = this.x.as( U.pixels );
                var y = this.y.as( U.pixels );
                if (x < 0 || x > width.as( U.pixels )
                    || y < 0 || y > height.as( U.pixels )) {

                    // Unlike MajicGame's bouncingBounds behavior,
                    // bulletBoundsRecall always recalls if it strikes the
                    // walls.
                    this.recall();

                    // ...but returning false from a callback still cancels
                    // further callbacks.
                    var onb = this.onBounce;
                    if (!onb) return;
                    else if (!onb instanceof Array)
                        onb = [onb];

                    for (var i=0; i < onb.length; ++i) {
                        if (!onb[i].call(this))
                            break;
                    }
                }
            };
        }
      , bulletRecallBehavior: function(data) {
            var onSlurp;
            if (data && data.onSlurp)
                onSlurp = data.onSlurp;
            return function(delta) {
                if (!this.isReturning) return;

                var distx = this.owner.x.sub( this.x ).as( U.pixels );
                var disty = this.owner.y.sub( this.y ).as( U.pixels );
                if (Math.sqrt(distx * distx + disty * disty)
                    < this.recallRadius.as( U.pixels )) {

                    this.rest();
                    if (onSlurp) {
                        onSlurp.call(this);
                    }
                }
                else {
                    var dir = Math.atan2(distx, disty);
                    var shift = this.speed.mul(delta);
                    var dx = shift.mul( Math.sin(dir) );
                    var dy = shift.mul( Math.cos(dir) );
                    this.x = this.x.add( dx );
                    this.y = this.y.add( dy );
                }
            }
        }
    };
})();
