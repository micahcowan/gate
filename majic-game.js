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
    MajicGame.prototype = new (function () {
        // FIXME: Event handling stuff should go in an ancestor class.
        this.addEventListener = function(eTag, handler) {
            var e = this._events = (this._events || {});
            if (e[eTag] === undefined) {
                e[eTag] = [];
                // XXX: Since we never remove these event listeners, we
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

                // Behave things
                this._things.forEach(function(thing) {
                    if (!thing.behavior) return;
                    thing.behavior.forEach(function(b) {
                        b.call(thing, delta.mul(1));
                    });
                });
            }

            // Draw things
            var screen = this.screen;
            this._things.forEach(function(thing) {
                if (thing.draw) thing.draw(screen)
            });

            var msecsPerFrame = this.targetFrameRate.inverse.as( U.millisecond.per.frame );
            window.setTimeout(this.tick.bind(this), msecsPerFrame);
        }

        this.targetFrameRate = U.frames( 50 ).per.second.relax();
        this.maxSkippedFrames = U.frames( 2.5 );
        this.paused = false;
        this.timeElapsed = U.seconds(0);
    })();

    MajicGame.Sprite = function() {};
    MajicGame.Sprite.prototype = {
        mergeData:
            function(data) {
                if (!data) return;
                for (var key in data) {
                    this[key] = data[key];
                }
            }
      , destroy:
            function() {
                var behavior = this.behavior
                if (!behavior) return;
                this.behavior = [];
                behavior.forEach(function(item){
                    if (item.destroy) item.destroy();
                });
            }
      // Initial defaults:
      , x: U.pixels( 0 ).relax()
      , y: U.pixels( 0 ).relax()
      , h: U.pixels( 0 ).per.second
      , v: U.pixels( 0 ).per.second
      , rot: U.radians( 0 )
    };

    MajicGame.spritePrototype = new MajicGame.Sprite;

    MajicGame.makeSpriteClass = function(data, initfn) {
        var newClass = function(ctorData) {
            this.mergeData(data);
            if (ctorData)
                this.mergeData(ctorData);
            if (initfn) {
                initfn.apply(this, arguments);
            }
        };
        newClass.prototype = MajicGame.spritePrototype;
        return newClass;
    };

    MajicGame.behavior = {
        momentum:
            function(delta) {
                var h, v;
                h = this.h.mul(delta) || U.pixels( 0 );
                v = this.v.mul(delta) || U.pixels( 0 );
                this.x = this.x.add( h ).relax();
                this.y = this.y.add( v ).relax();
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
                var tracker = {};
                var mkhandler = function(tag) {
                    return function(e) {
                        tracker[tag] = true;
                    };
                };
                ['clock', 'counter'].forEach(function(item){
                    if (!(item in keys)) return;
                    var k;
                    if (keys[item] instanceof Array)
                        k = keys[item];
                    else
                        k = [keys[item]];
                    k.forEach(function(key) {
                        mk.connect(key, mkhandler(item));
                    });
                });
                var retval = function(delta) {
                    // FIXME: instead of manually emptying, keep a
                    // reference to something that contains tracker, and
                    // then replace the inner ref with {}
                    for (var key in tracker) {
                        tracker[key] = false;
                    }
                    mk.pulse();
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
                var tracker = {};
                var sideToAngle = {
                    forward:    0
                  , back:       Math.PI
                  , left:       Math.PI * 3/2
                  , right:      Math.PI / 2
                };
                var mkhandler = function(tag) {
                    return function(e) {
                        tracker[tag] = true;
                    };
                };
                Object.keys(sideToAngle).forEach(function(side){
                    if (!(side in keys)) return;
                    var k;
                    if (keys[side] instanceof Array)
                        k = keys[side];
                    else
                        k = [keys[side]];
                    k.forEach(function(key) {
                        mk.connect(key, mkhandler(side));
                    });
                });
                var retval = function(delta) {
                    var sprite = this;
                    for (var key in tracker) {
                        tracker[key] = false;
                    }
                    mk.pulse();
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
    };

    return MajicGame;
})();
