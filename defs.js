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
    };
    GA.GateGroup.prototype = [];

    GA.Background = function() {
        this.draw = GA.art.drawBackground;
    };
    GA.Background.prototype = spritePrototype;

    GA.bulletProtoClass = function() {
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
                    bullet = owner.bullet = new GA.sprites.Bullet(data);
                    bullet.owner = owner;
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

                bullet.behavior.forEach(function(b) {
                    b.call(bullet, delta.mul(1));
                })
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

                    this.recall();
                    if (this.onBounce)
                        this.onBounce.call(this);
                }
            };
        }
      , bulletRecallBehavior: function(delta) {
            if (!this.isReturning) return;

            var distx = this.owner.x.sub( this.x ).as( U.pixels );
            var disty = this.owner.y.sub( this.y ).as( U.pixels );
            var dir = Math.atan2(distx, disty);
            var shift = this.speed.mul(delta);
            this.x = this.x.add( shift.mul( Math.sin(dir) ) );
            this.y = this.y.add( shift.mul( Math.cos(dir) ) );
        }
    };
})();
