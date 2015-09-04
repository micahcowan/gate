"use strict";

var MajicGame = (function() {
    var U = MajicUnits;

    var MajicGame = function() {};
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
            // XXX Use MajicUnits.
            var msecsPerFrame = 1000 / this.targetFrameRate;
            this.timeElapsed = U.seconds( 0 );
            this.now = U.now();

            this.canvas = document.getElementById('game');
            this.screen = this.canvas.getContext('2d');
            this.width = U.pixels( this.canvas.width ).relax();
            this.height = U.pixels( this.canvas.height ).relax();

            window.setTimeout(this.tick.bind(this), msecsPerFrame);
        };
        this.tick = function() {
            var secsPerFrame = this.targetFrameRate.inverse;
            if (!this.paused) {
                var now = U.now();
                var delta = now.sub(this.now);
                var maxDelta = secsPerFrame.mul(this.maxSkippedFrames);
                if (delta.as(U.millisecond) > maxDelta.as(U.millisecond))
                    delta = maxDelta;
                this.now = now;
                this.timeElapsed = this.timeElapsed.add(delta);
            }

            // Behave things
            this._things.forEach(function(thing) {
                if (!thing.behavior) return;
                thing.behavior.forEach(function(b) {
                    b.call(thing, delta);
                });
            });

            // Draw things
            var screen = this.screen;
            this._things.forEach(function(thing) {
                if (thing.draw) thing.draw(screen)
            });

            var msecsPerFrame = 1000 / this.targetFrameRate;
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
    };

    MajicGame.spritePrototype = new MajicGame.Sprite;

    MajicGame.makeSpriteClass = function(data, initfn) {
        var newClass = function() {
            this.mergeData(data);
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
                    var h = this.h.mul(delta).as( U.pixel );
                    var v = this.v.mul(delta).as( U.pixel );
                    var dir = Math.atan2(h, v);
                    var mult = value.mul(delta).relax();
                    var dh = mult * Math.sin(dir);
                    var dv = mult * Math.cos(dir);
                    if (Math.abs(dh) > Math.abs(h))
                        this.h = U.pixels( 0 ).per.second;
                    else
                        this.h = this.h.sub( U.pixels( dh ).per.second );

                    if (Math.abs(dv) > Math.abs(v))
                        this.v = U.pixels( 0 ).per.second;
                    else
                        this.v = this.v.sub( U.pixels( dv ).per.second );
                };
            }
      , rotateKeys:
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
                function thrust(h, v) {
                }
                return function() {
                };
            }
    };

    return MajicGame;
})();
