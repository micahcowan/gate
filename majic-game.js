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
            var msecsPerFrame = 1000 / this.framesPerSec;
            this.timeElapsed = 0;
            this.now = new Date();

            this.canvas = document.getElementById('game');
            this.screen = this.canvas.getContext('2d');
            this.width = this.canvas.width;
            this.height = this.canvas.height;

            window.setTimeout(this.tick.bind(this), msecsPerFrame);
        };
        this.tick = function() {
            if (!this.paused) {
                var now = new Date();
                var delta = now - this.now;
                if (delta > this.maxMsecsPerFrame)
                    delta = this.maxMsecsPerFrame;
                now = this.now += delta;
            }

            // Draw things
            var screen = this.screen;
            this._things.forEach(function(thing) {thing.draw(screen)});

            var msecsPerFrame = 1000 / this.framesPerSec;
            window.setTimeout(this.tick.bind(this), msecsPerFrame);
        }

        this.framesPerSec = 50;
        this.maxMsecsPerFrame = 2 * (1000 / this.framesPerSec); // XXX MajicUnits
        this.paused = false;
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
        friction:
            function(value) {
                if (!(value instanceof U.UnitValue)) {
                    value = U.pixels(value).per.second.per.second;
                }
                return function(delta) {
                    // FIXME: right now, only handles rotation/velocity,
                    // not h/v
                    this.vel.sub( value.mul( delta ) );
                    if (this.vel.as( U.pixel.per.second ) < 0)
                        this.vel.set(0);
                };
            }
    };

    return MajicGame;
})();
