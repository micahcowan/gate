"use strict";

(function() {
    function MicahGame() {}
    MicahGame.prototype = new (function () {
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
        this.eventHandler = function(tag, e) {
            var e = this._events;
            var f = e[eTag];
            if (f !== undefined) {
                for (var i=0; i != f.length; ++i) {
                    f[i](e);
                }
            }
        };
        this.resetThings = function() {
            this._things = [];
            this._things.push.apply(this._things, arguments);
        };
        this.start = function() {
            // XXX Use Units.
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
            for (var i=0; i != this._things.length; ++i) {
                this._things[i].draw(this.screen);
            }

            var msecsPerFrame = 1000 / this.framesPerSec;
            window.setTimeout(this.tick.bind(this), msecsPerFrame);
        }

        this.framesPerSec = 50;
        this.maxMsecsPerFrame = 2 * (1000 / this.framesPerSec); // XXX Units
        this.paused = false;
    })();

    MicahGame.Thing = function() {
    };

    window.MicahGame = MicahGame;
})();
