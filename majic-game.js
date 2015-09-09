"use strict";

var MajicGame = (function() {
    var U = MajicUnits;

    var MajicGame = function(canvas) {
        this.canvas = canvas;
        this.screen = canvas.getContext('2d');
        this.width = U.pixels( canvas.width ).relax();
        this.height = U.pixels( canvas.height ).relax();
        // Useful as sprite spawn point:
        this.center = {
            x: this.width.div(2).relax()
          , y: this.height.div(2).relax()
        };

    };
    var MajicGamePrototype = function () {
        this.resetSprites = function() {
            this._things = [];
            this._things.push.apply(this._things, arguments);
        };
        this.start = function() {
            var msecsPerFrame = this.targetFrameRate.inverse.as( U.millisecond.per.frame );
            this.timeElapsed = U.seconds( 0 );
            this.now = U.now();

            window.setTimeout(this.tick.bind(this), msecsPerFrame);
        };
        this.tick = function() {
            var secsPerFrame = this.targetFrameRate.inverse;
            var delta;
            if (!this.paused) {
                var now = U.now();
                delta = now.sub(this.now);
                var maxDelta = secsPerFrame.mul(this.maxSkippedFrames);
                if (delta.as(U.millisecond) > maxDelta.as(U.millisecond))
                    delta = maxDelta;
                this.now = now;
                this.timeElapsed = this.timeElapsed.add(delta);

                this.behaveAll(delta, this._things);
            }

            // Draw things
            this.drawAll(this._things)

            var msecsPerFrame = this.targetFrameRate.inverse.as( U.millisecond.per.frame );
            window.setTimeout(this.tick.bind(this), msecsPerFrame);
        };
        this.drawAll = function(list) {
            var screen = this.screen;
            var game = this;
            list.forEach(function(thing) {
                if (thing.draw) thing.draw(screen)
                else if (thing instanceof Array) {
                    game.drawAll(thing);
                }
            });
        };
        this.behaveAll = function(delta, list) {
            var game = this;
            list.forEach(function(thing) {
                if (!thing.behavior) return;
                thing.behavior.forEach(function(b) {
                    if (b instanceof Array)
                        b.forEach(function(bb) {
                            game.behaveAll(delta, bb);
                        });
                    else
                        b.call(thing, delta.mul(1));
                });
            });
        };

        this.targetFrameRate = U.frames( 50 ).per.second.relax()
        this.maxSkippedFrames = U.frames( 2.5 );
        this.paused = false;
        this.timeElapsed = U.seconds(0);
    };
    var EventTarget = MajicGame.EventTarget = function() {
        this.addEventListener = function(eTag, handler) {
            var e = this._events = (this._events || {});
            if (e[eTag] === undefined) {
                e[eTag] = [];
                // FIXME: Since we never remove these event listeners, we
                // can't ever be garbage collected.
                window.addEventListener(eTag, this.eventHandler.bind(this, eTag));
            }
            var f = e[eTag];
            f.push(handler);
        };
        this.removeEventListener = function(eTag, handler) {
            var e = this._events;
            var f = e[eTag];
            if (f !== undefined) {
                for (var i=0; i != f.length; ++i) {
                    var g = f[i];
                    if (g === handler) {
                        f.splice(i, 1);
                        return;
                    }
                }
            }
        };
        this.eventHandler = function(tag, ev) {
            var e = this._events;
            var f = e[tag];
            if (f !== undefined) {
                f.forEach(function(iter) {iter(ev);});
            }
        };
        this.dispatchEvent = function(ev) {
            this.eventHandler(ev.type, ev);
        };
    };
    MajicGamePrototype.prototype = new EventTarget;
    MajicGame.prototype = new MajicGamePrototype;

    MajicGame.Event = function(type, data) {
        this.type = type;
        this.preventDefault = function(){};
        if (!data) return;
        for (var key in data) {
            this[key] = data[key];
        }
    };

    MajicGame.Sprite = function() {};
    var SpritePrototype = function() {
        this.mergeData = function(data) {
            if (!data) return;
            for (var key in data) {
                this[key] = data[key];
            }
        };
        this.destroy = function() {
            var behavior = this.behavior
            if (!behavior) return;
            this.behavior = [];
            behavior.forEach(function(item){
                if (item.destroy) item.destroy();
            });
        };
        // Initial defaults:
        this.x = U.pixels( 0 );
        this.y = U.pixels( 0 );
        this.h = U.pixels( 0 ).per.second;
        this.v = U.pixels( 0 ).per.second;
        this.rot = U.radians( 0 );
    };
    SpritePrototype.prototype = new EventTarget;
    MajicGame.Sprite.prototype = new SpritePrototype;

    MajicGame.spritePrototype = new MajicGame.Sprite;

    MajicGame.makeSpriteClass = function(data, proto) {
        var newClass = function() {
            this.mergeData(data);
            if (this.initSprite) {
                this.initSprite.apply(this, arguments);
            }
            else if (arguments.length > 0) {
                // Default initialization is to merge data from first arg.
                this.mergeData(arguments[0]);
            }
        };
        if (proto) {
            proto.prototype = MajicGame.spritePrototype;
            newClass.prototype = new proto;
        }
        else
            newClass.prototype = MajicGame.spritePrototype;
        return newClass;
    };

    MajicGame.behavior = {
        momentum:
            function(delta) {
                var h, v;
                h = this.h.mul(delta) || U.pixels( 0 );
                v = this.v.mul(delta) || U.pixels( 0 );
                this.x = this.x.add( h );
                this.y = this.y.add( v );
            }
      , friction:
            function(value) {
                if (!(value instanceof U.UnitValue)) {
                    value = U.pixels(value).per.second.per.second;
                }
                return function(delta) {
                    var h = this.h.as( U.pixel.per.second );
                    var v = this.v.as( U.pixel.per.second );
                    var spd = U.pixels( Math.sqrt(h*h + v*v) ).per.second;
                    var reduct = value.mul(delta);
                    if (spd.as( U.pixel.per.second ) < reduct.as( U.pixel.per.second ))
                        spd = U.pixels( 0 ).per.second;
                    else
                        spd = spd.sub( reduct );

                    var dir = Math.atan2(h, v);
                    this.h = spd.mul( Math.sin(dir) );
                    this.v = spd.mul( Math.cos(dir) );
                };
            }
      , rotateKeys:
            // rotateKeys and thrustKeys have too much in common. Farm
            // it out (probably mostly into MajicKeys?)
            function(keys, strength) {
                var mk = new MajicKeys;
                mk.actions(keys);
                var retval = function(delta) {
                    var tracker = mk.pulse();
                    if (tracker.clock)
                        this.rot = this.rot.add( strength.mul(delta) );
                    if (tracker.counter)
                        this.rot = this.rot.sub( strength.mul(delta) );
                };
                retval.destroy = mk.destroy.bind(mk);
                return retval;
            }
      , thrustKeys:
            function(keys, strength) {
                var mk = new MajicKeys;
                mk.actions(keys);
                var sideToAngle = {
                    forward:    0
                  , back:       Math.PI
                  , left:       Math.PI * 3/2
                  , right:      Math.PI / 2
                };
                var retval = function(delta) {
                    var sprite = this;
                    var tracker = mk.pulse();
                    var dir = this.rot.as( U.radian );
                    var adjStr = strength.mul( delta );
                    Object.keys(sideToAngle).forEach(function(side){
                        if (tracker[side]) {
                            var dir2 = sideToAngle[side];
                            sprite.h = sprite.h.add(
                                adjStr.mul( Math.sin(dir + dir2) )
                            );
                            sprite.v = sprite.v.sub(
                                adjStr.mul( Math.cos(dir + dir2) )
                            );
                        }
                    });
                };
                retval.destroy = mk.destroy.bind(mk);
                return retval;
            }
      , speedLimited:
            function(limit) {
                return function() {
                    // FIXME: there's some logic overlap with friction
                    // behavior.
                    var h = this.h.as( U.pixel.per.second );
                    var v = this.v.as( U.pixel.per.second );
                    var spd = U.pixels( Math.sqrt(h*h + v*v) ).per.second;

                    if (spd.as( U.pixel.per.second ) > limit.as( U.pixel.per.second )) {
                        var dir = Math.atan2(h, v);
                        this.h = limit.mul( Math.sin(dir) );
                        this.v = limit.mul( Math.cos(dir) );
                    }
                };
            }
      , bouncingBounds:
            function(width, height, cb) {
                return function(delta) {
                    var bouncing = false;
                    var x = this.x.as( U.pixel );
                    var y = this.y.as( U.pixel );
                    var w = width.as( U.pixel );
                    var h = height.as( U.pixel );
                    var newX = this.x;
                    var newY = this.y;
                    var newH = this.h;
                    var newV = this.v;
                    if (x < 0) {
                        newX = this.x.mul(-1);
                        newH = this.h.mul(-1);
                        bouncing = true;
                    }
                    else if (x > w) {
                        newX = this.x.sub( U.pixels( 2 * (x-w) ) );
                        newH = this.h.mul(-1);
                        bouncing = true;
                    }

                    if (y < 0) {
                        newY = this.y.mul(-1);
                        newV = this.v.mul(-1);
                        bouncing = true;
                    }
                    else if (y > h) {
                        newY = this.y.sub( U.pixels( 2 * (y-h) ) );
                        newV = this.v.mul(-1);
                        bouncing = true;
                    }

                    // We're going to bounce. Use callbacks.
                    // They have an opportunity to halt further
                    // callbacking, and cancel the bounce, if they
                    // return === false.
                    var doDefault = true;
                    if (bouncing) {
                        if (!cb) {
                            cb = [];
                        }
                        else if (!cb instanceof Array)
                            cb = [cb];

                        for (var i=0; i < cb.length; ++i) {
                            doDefault = cb[i].call(this);
                            if (!doDefault)
                                break;
                        }
                    }

                    if (doDefault) {
                        this.x = newX;
                        this.y = newY;
                        this.h = newH;
                        this.v = newV;
                    }
                }
            }
    };

    return MajicGame;
})();
