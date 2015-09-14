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

        var processBehavior = function(thing, delta, b) {
            if (b instanceof Array)
                b.forEach(processBehavior.bind(undefined, thing, delta));
            else
                b.call(thing, delta.mul(1));
        };
        this.behaveAll = function(delta, behavable) {
            var game = this;

            if (behavable.behavior) // An array may also have a behavior
                processBehavior(behavable, delta, behavable.behavior);
            if (behavable instanceof Array) {
                behavable.forEach(function (item) {
                    game.behaveAll(delta, item);
                });
            }
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
            function(left, top, right, bottom, cb) {
                return function(delta) {
                    var bouncing = false;
                    var x = this.x.as( U.pixel );
                    var y = this.y.as( U.pixel );
                    var l = left.as( U.pixel );
                    var t = top.as( U.pixel );
                    var r = right.as( U.pixel );
                    var b = bottom.as( U.pixel );
                    var newX = this.x;
                    var newY = this.y;
                    var newH = this.h;
                    var newV = this.v;
                    if (x < l) {
                        newX = this.x.sub( U.pixels( 2 * (x-l) ) );
                        newH = this.h.mul(-1);
                        bouncing = true;
                    }
                    else if (x > r) {
                        newX = this.x.sub( U.pixels( 2 * (x-r) ) );
                        newH = this.h.mul(-1);
                        bouncing = true;
                    }

                    if (y < t) {
                        newY = this.y.sub( U.pixels( 2 * (y-t) ) );
                        newV = this.v.mul(-1);
                        bouncing = true;
                    }
                    else if (y > b) {
                        newY = this.y.sub( U.pixels( 2 * (y-b) ) );
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
                        else if (!(cb instanceof Array))
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
      , boundedLanceWandering:
            function( l, t, r, b ) {
                var behavior = [
                    MajicGame.behavior.dirAndSpeedToVelocity
                  , MajicGame.behavior.momentum
                  , MajicGame.behavior.boundedLanceDirectionality(l, t, r, b)
                ];
                return behavior;
            }
      , dirAndSpeedToVelocity:
            function() {
                var dir = this.dir.as( U.radians );
                this.h = this.speed.mul( Math.sin(dir) );
                this.v = this.speed.mul( Math.cos(dir) );
            }
      , boundedLanceDirectionality:
            function(left, top, right, bottom) {
                return function() {
                    // Redirect our direction whenever the "lance" hits a
                    // wall.

                    var xy = [ this.x.as( U.pixels ), this.y.as( U.pixels ) ];
                    var lance = this.lanceSize.as( U.pixels );
                    var dir = this.dir.as( U.radians );
                    var bxy = [ xy[0] + lance * Math.sin(dir), xy[1] + lance * Math.cos(dir) ];
                    var bounds = [
                        [ left, right ]
                      , [ top, bottom ]
                    ];
                    var t, u, e;
                    var pm;
                    var poss;
                    var dirs, dists;
                    var diff;

                    if (bxy[0] < bounds[0][0] || bxy[0] > bounds[0][1]) {
                        t = 0;
                        u = 1;
                        e = bxy[0] < bounds[0][0]? bounds[0][0] : bounds[0][1];
                        if (bxy[1] < bounds[1][0] || bxy[1] > bounds[1][1]) {
                            // We've just driven the lance into a corner.
                            // If the lance line is mainly pointing
                            // vertically, slide horizontally.
                            if (Math.abs(bxy[1] - xy[1])
                                > Math.abs(bxy[0] - xy[0])) {

                                t = 1;
                                u = 0;
                                e = bxy[1] < bounds[1][0]? bounds[1][0]
                                    : bounds[1][1];
                            }
                        }
                    }
                    else if (bxy[1] < bounds[1][0] || bxy[1] > bounds[1][1]) {
                        t = 1;
                        u = 0;
                        e = bxy[1] < bounds[1][0]? bounds[1][0] : bounds[1][1];
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
                    pm = Math.sqrt((lance * lance) - (xy[t] - e) * (xy[t] - e));
                    poss = [xy[u] - pm, xy[u] + pm];

                    // Okay, so which of the +/- branch should we choose?
                    // First, if one of them turns out to be out of bounds,
                    // then it's ruled out.
                    if (poss[0] < bounds[u][0])
                        poss.splice(0, 1);
                    else if (poss[1] > bounds[u][1])
                        poss.splice(1, 1);

                    dirs = poss.map(function (x) {
                        return t == 0? Math.atan2(e - xy[t], x - xy[u])
                                     : Math.atan2(x - xy[u], e - xy[t]);
                    });

                    if (dirs.length > 1) {
                        // Okay, next, choose whichever branch brings us to
                        // the closest direction to the current one.
                        dists = dirs.map(function (x) {
                            return Math.abs(U.diffRadians(dir, x));
                        });

                        diff = dists[0] - dists[1];
                        if (Math.abs(diff) < 0.0001) {
                            // Both are equal; just pick one randomly.
                            dir = dirs[ Math.floor( 2 * Math.random() ) ];
                        }
                        else {
                            dir = dirs[ diff > 0? 1 : 0 ];
                        }
                    }
                    else {
                        dir = dirs[0];
                    }
                    this.dir = U.radians( dir );
                };
            }
    };

    return MajicGame;
})();
