"use strict";

var MajicUnits = (function() {

    //// MajicUnits  /////////////////////////////////////////////

    // Throughout this module, everything exposed to the outside world
    // as MajicUnits, is referred to by the object "U". U's
    // constructor has a prototype, UnitsTopProto, which is used to
    // add more things that will be exposed by U/MajicUnits (including
    // some things that might be added by automation running after this
    // module has finished.

    // U's constructor here is _U. It only exists as a convenient way to
    // arrange the prototype UnitsTopProto; _U is not referenced after
    // this stanza.
    var _U = function() {};
    var UnitsTopProto = {};
    _U.prototype = UnitsTopProto;
    var U = new _U;

    // muError: This is the function we call when a user uses a unit
    // improperly.  For instance, U.pixels( 16 ).per.second.as( U.pixels // )
    //
    // We try to use browser-specific extensions, where available, to
    // include a stack backtrace, so you can see where the offending
    // usage actually took place. If you are getting the exceptions but
    // not a backtrace, try debugging under a browser that has Error
    // objects that include the .stack property until you've routed out
    // the problem (or, if your favored browser supports backtraces some
    // other way, send a patch to support that with muError :) ).
    var muError = function(msg) {
        if (window.Error) {
            var err = new Error(msg);
            if (err.stack) {
                msg += "\n" + err.stack;
            }
            else {
                throw err;
            }
        }

        throw msg;
    };

    // U.now()
    UnitsTopProto.now = function() {
        return U.milliseconds( (new Date).valueOf() );
    }

    //// class UnitValue  ////////////////////////////////////////
    //
    // This constructor is behind all the values you actually construct
    // with MajicUnits. Any valued result you save away (apart from
    // extracted values) is a UnitValue object.
    //
    var UnitValue = UnitsTopProto.UnitValue = function(value, numUnits, denomUnits) {
        // FIXME: should possibly protect num/denom by setting all their
        // properties read-only

        // XXX kludge for radians, to keep them in bounds between 0
        // and 2 * PI. Should have a hook system if more
        // of these arise.
        if (Object.keys(numUnits).length == 1 && 'radian' in numUnits) {
            if (value < 0) {
                value = 2 * Math.PI + (value % (2 * Math.PI));
            }
            else {
                value = value % (2 * Math.PI);
            }
        }

        this._value = value;
        this._numUnits = numUnits;
        this._denomUnits = denomUnits;
    };
    UnitValue.prototype = {
        ////  relax method  ////
        //
        // turns off strict checking when you attempt to access a
        // UnitValue as if it were a normal number (i.e., when
        // .valueOf() gets called).
        //
        // FIXME: since the number returned is always represented in a
        // base unit type (e.g. maybe seconds, but never milliseconds),
        // you'll get unexpected results with:
        //
        //   var waitMsecs = U.milliseconds(100);
        //   wait( waitMsecs ); // equiv to: wait( waitMsecs.valueOf() )
        //
        // If wait() was expecting its argument in milliseconds, it will
        // receive a drastically low substitute, as waitMsecs.valueOf()
        // will return the value in seconds, or 0.1.
        //
        // Should replace this with something like relaxAs( ... ), which
        // accepts a unit specification that it verifies/converts to on
        // value use.
        //
        // ALTERNATIVELY, we could track derivative units like
        // milliseconds as proper units in numerators and denominators,
        // but being sure to combine them... that seems more trouble
        // than it's worth.
        //
        // Or, store some sort of multiplier, used with valueOf()... but
        // I'm not sure how .per.second and the like might affect
        // that...
        relax:
            function() {
                if (arguments.length > 0) {
                    this._relax = arguments[0];
                }
                else {
                    this._relax = true;
                }
                return this;
            }
        ////  mul method  ////
        //
        // Returns a new UnitValue whose value is the product of the
        // values of the operands, combining their numerator and
        // denominator types.  (10 px/s * 2 px = 20 px^2/s)
      , mul:
            function(x) {
                if (x instanceof UnitValue) {
                    var newNum = {};
                    var newDenom = {};
                    for (var u in x._numUnits) {
                        newNum[u] = x._numUnits[u];
                    }
                    for (var u in this._numUnits) {
                        if (u in newNum)
                            newNum[u] += this._numUnits[u];
                        else
                            newNum[u] = this._numUnits[u];
                    }
                    for (var u in x._denomUnits) {
                        newDenom[u] = x._denomUnits[u];
                    }
                    for (var u in this._denomUnits) {
                        if (u in newDenom)
                            newDenom[u] += this._denomUnits[u];
                        else
                            newDenom[u] = this._denomUnits[u];
                    }
                    for (var u in newNum) {
                        if (u in newDenom) {
                            var p = newNum[u], q = newDenom[u];
                            if (p == q) {
                                delete newNum[u];
                                delete newDenom[u];
                            }
                            else if (p > q) {
                                newNum[u] = p - q;
                                delete newDenom[u];
                            }
                            else {
                                delete newNum[u];
                                newDenom[u] = q - p;
                            }
                        }
                    }

                    return (new UnitValue(this._value * x._value, newNum, newDenom));
                }
                else {
                    return (new UnitValue(this._value * x, this._numUnits, this._denomUnits));
                }
            }
      //// div method ////
      //
      // inverse of the .mul() method. Just inverts the second operand
      // and calls .mul().
      //
      , div:
            function(uval) {
                if (uval instanceof UnitValue)
                    return this.mul(uval.inverse);
                else
                    return this.mul(1/uval);
            }
      //// add method ////
      //
      // returns the sum of two values. Their unit types must be
      // identical.
      //
      , add:
            function(uval) {
                if (uval.typeTag() != this.typeTag()) {
                    muError("Can't add operand " + uval.toString()
                            + " to base " + this.toString())
                }
                return new UnitValue(this._value + uval._value, this._numUnits, this._denomUnits);
            }
      //// sub method ////
      //
      // returns the difference of two values. Their unit types must be
      // identical.
      //
      , sub:
            function(uval) {
                if (uval.typeTag() != this.typeTag()) {
                    muError("Can't sub operand " + uval.toString()
                            + " from base " + this.toString())
                }
                return new UnitValue(this._value - uval._value, this._numUnits, this._denomUnits);
            }
      //// set method ////
      //
      // Directly sets (replaces) the value component of a UnitValue.
      // Don't use this unless you know what you're doing (see .relax()
      // for caveats about base unit types).
      //
      // ...God, having that
      //    , set :
      // there makes it really look like it's an accessor function,
      // especially followed by other actual accessors. But nope, just a
      // method named .set().
      , set:
            function(val) {
                this._value = 0 + val;
            }
      //// .inverse property accessor ////
      //
      // returns the inversion of the value, and of the num/denom unit
      // types.
      //
      , get inverse() {
                return (new UnitValue(1 / this._value, this._denomUnits, this._numUnits));
            }
      //// .per property accessor ////
      //
      // Not really intended to be used by itself:
      //
      //   var foo = U.pixels( 10 ).per; // What? Makes no sense.
      //
      // But the underlying object returned by the .per property
      // provides useful accessors, such that
      //
      //   U.pixels( 10 ).per.second
      //
      // is equivalent to
      //
      //   U.pixels( 10 ).div( U.seconds(1) )
      //
      // However, it's not so much used to be a conceptual equivalent to
      // .div() (such use should probably be discouraged); instead, it
      // is used to modify the underlying unit types (specifically, the
      // denominators units).
      //
      , get per() {
                return new UnitPer(this);
            }
      //// .extractable property accessor ////
      //
      // Returns whether use of .valueOf() is allowed, or will return
      // an exception.
      // 
      , get extractable() {
                return this._relax || Object.keys(this._numUnits).length == 0 && Object.keys(this._denomUnits).length == 0;
            }
      //// .as method ////
      //
      // Used to extract the underlying value, confirming that you know
      // the correct units it's expressed in (and converting between
      // derivative types as needed).
      //
      //   var secs = U.seconds( 3 );
      //   secs.as( U.millisecond );  // -> 3000
      //
      , as:
            function(div) {
                if (div instanceof Function) {
                    // Probably wrote U.pixels instead of U.pixel.
                    // Accommodate.
                    div = div(1);
                }
                var result = this.div( div );
                if (result.extractable)
                    return result.valueOf();
                else {
                    muError("Can't extract as " + this._value + " " + div.typeTag() + "; value is in " + this.typeTag());
                }
            }
      //// valueOf method ////
      //
      // Returns the numeric value of this UnitValue, but ONLY if there
      // are no units in the numerator OR the denominator (or if
      // .relax() was called; but be careful with that!).
      //
      //   var foo = U.pixels( 12 );
      //   var bar = foo.div( U.pixels(4) );  // 12px / 4px = 3 (no units).
      //   var baz = bar + 10;  // Safe to use! .valueOf() extracts as 3.
      //
      , valueOf:
            function() {
                if (this.extractable) {
                    return this._value;
                }
                else {
                    muError("Can't produce a value: value is in " + this.typeTag());
                }
            }
      //// toString method ////
      //
      // Returns a string representation of this UnitValue. Always safe
      // to use.
      //
      , toString:
            function() {
                var tag = this.typeTag();
                if (tag.length > 1)
                    tag = " " + tag;
                return this._value.toString() + tag;
            }
      //// typeTag method ////
      //
      // Represents the units for this UnitValue via a unique tag
      // (e.g., pixels per second are "px/s").
      //
      , typeTag:
            function() {
                var nums = Object.keys(this._numUnits).sort();
                var denoms = Object.keys(this._denomUnits).sort();
                var ret = "";

                if (nums.length == 0 && denoms.length == 0)
                    return ret;

                function t(n, count) {
                    ret += n.map(function(x) {
                        var tag = unitTypes[x].nick;
                        if (count[x] > 1) {
                            tag += count[x].toString();
                        }
                        return tag;
                    }).join('.');
                }
                if (nums.length == 0) {
                    ret += "1";
                }
                else {
                    t(nums, this._numUnits);
                }

                if (denoms.length != 0) {
                    ret += "/";
                    t(denoms, this._denomUnits);
                }

                return ret;
            }
    };

    // The following provide "unit" types (U.units() and U.unit)
    // that represent a value that's not expressed in any measurement
    // units.
    //
    // They are NOT available via e.g. .per.unit, as that would in any
    // case be a no-op.
    //
    // Useful for boxing up a normal number to give it the various
    // properties and methods of a UnitValue.
    UnitsTopProto.units = function(val) {
        return new UnitValue(val, {}, {});
    };
    UnitsTopProto.unit = UnitsTopProto.units(1);

    // class UnitPer
    //
    // Constructor used to generate the (interim) objects obtained via
    // the .per property on UnitValues. The constructor doesn't do
    // anything interesting, just remembers the UnitValue whose property
    // it was (to pass along down the chain).
    //
    // The real work is done by the class prototype, which is defined as
    // empty here. Members are added to it for each unit of measure we
    // define.
    var UnitPer = function(unitValue) {
        this.unitValue = unitValue;
    };
    UnitPer.prototype = {
    };

    // A record of all the unit types we know of. Internal.
    var unitTypes = {};

    // A record of all the plurals of unit types. Internal.
    var unitPlurals = {};

    // A record of all nicks. Internal.
    var unitNicks = {};

    var guaranteeLabelOkay = function(label) {
        if (label.length == 0) {
            throw "Can't define unit with empty label.";
        }
        if (label.match(/[^A-Za-z]/)) {
            throw "Improper unit label \"" + label + "\": only upper/lower ASCII letters allowed."
        }
        if (label in UnitsTopProto) {
            throw "Can't use unit label \"" + label + "\": the property MajicUnits." + label + " already exists!";
        }
        if ((label in unitTypes) || (label in unitPlurals)
            || (label in unitNicks)) {

            throw "Can't define new unit with label \"" + label + "\" - label already exists!";
        }
    }

    // unitMaker: a utility function used by U.addUnitType() (defined
    // just below). This is used to make the various top-level
    // unit-manufacturing functions and properties (U.seconds( 10 ),
    // U.pixel, etc) do their thing.
    var unitMaker = function(unit) {
        if (typeof unit == 'string') {
            return function(val) {
                var n = {};
                n[unit] = 1;
                return new UnitValue(val, n, {});
            };
        }
        else {
            return function(val) {
                // The (1 *) makes sure it's a number, or convertible to
                // one.
                return unit.mul(1 * val);
            };
        }
    };

    //// addUnitType method  ////
    //
    // This is a method for adding a new user-defined unit.
    // It takes three arguments. The first two are the name of the unit
    // type, and the pluralized name of the unit type. The third
    // argument is EITHER a nickname used to generate type tags (see the
    // U.typeTag() method), or else it describes a UnitValue that is
    // identical in meaning.
    //
    // All of the label, plural, and nick must be unique - including
    // across one another.
    //
    // This same function is used a little further down to create the
    // initially available unit types.
    //
    // Examples (real ones that appear further below):
    //   U.addUnitType('second', 'seconds', 's');
    //   U.addUnitType('millisecond', 'milliseconds', U.second(0.001));
    //   
    UnitsTopProto.addUnitType = function(label, plural, nick) {
        var baseUnit = undefined;
        var checks = [label, plural];
        if ((typeof nick) != 'string') {
            baseUnit = nick;
            nick = undefined;
        }
        else {
            checks.push(nick);
        }

        checks.forEach(guaranteeLabelOkay.bind(undefined, label))

        var type = {
            label:  label
          , plural: plural
          , nick:   nick
        };

        // Register type
        if (label == 'unit' || unitTypes[label]) {
            muError("Unit type \"" + label + "\" already exists");
        }
        unitTypes[label] = type;
        unitPlurals[plural] = type;
        if (nick)
            unitNicks[nick] = type;

        // Add properties to top-level object's prototype.
        // This creates methods such as .seconds(N) and .second, to
        // generate values of that unit type.
        var um, umm;
        if (baseUnit) {
            type.equiv = baseUnit;
            umm = unitMaker.bind(undefined, baseUnit);
        } else {
            umm = unitMaker.bind(undefined, label);
        }
        um = umm();
        UnitsTopProto[plural] = um;
        // .second property access is exactly the same as calling
        // .seconds(1).
        Object.defineProperty(UnitsTopProto, label, {
            get: function() { return um(1); }
        });
        Object.defineProperty(UnitsTopProto, plural, {
            get: function() {
                var uval = this;
                var ret = umm();
                Object.defineProperty(ret, 'per', {
                    get: function() {
                        return new UnitPer(um(1));
                    }
                });
                return ret;
            }
        });

        // Add properties to .per

        // Note that, since this adds properties to the UnitPer
        // constructor's prototype, all UnitValues ever constructed
        // automatically get the new units' information in their .per
        // properties. :)
        UnitPer.prototype[plural] = function(x) {
            return this.unitValue.div(um(x));
        };
        Object.defineProperty(UnitPer.prototype, label, {
            get: function() {
                     return this[plural](1);
                 }
        });
    };

    UnitsTopProto.diffRadians = function(a, b) {
        // Return the diff between a and b, with an absolute value < pi,
        // (allowing negative). Return is NOT a UnitValue, which would
        // disallow negative results.
        if (!(a instanceof UnitValue))
            a = U.radians( a );
        if (!(b instanceof UnitValue))
            b = U.radians( b );
        var diff = a.as( U.radians ) - b.as( U.radians );
        if (diff < -Math.PI)
            diff = diff + 2 * Math.PI;
        else if (diff > Math.PI)
            diff = diff - 2 * Math.PI;
        return diff;
    };

    // Now that the machinery's all in place, let's define our units of
    // measure!
    var types = [
        ['metre', 'metres', 'm']
      , ['pixel', 'pixels', 'px']
      , ['radian', 'radians', 'rad']
      , ['second', 'seconds', 's']
      , ['frame', 'frames', 'frm']
    ];
    for (var i=0; i != types.length; ++i) {
        U.addUnitType.apply(U, types[i]);
    }

    // Derivative types
    types = [
        ['millisecond', 'milliseconds', U.seconds(1 / 1000)]
      , ['microsecond', 'microseconds', U.seconds(1 / 1000000)]
      , ['nanosecond', 'nanoseconds', U.seconds(1 / 1000000000)]

      , ['minute', 'minutes', U.seconds(60)]
      , ['hour', 'hours', U.seconds(60 * 60)]
      , ['day', 'days', U.seconds(24 * 60 * 60)]

      , ['centimetre', 'centimetres', U.metres(0.01)]
      , ['kilometre', 'kilometres', U.metres(1000)]
      // Alternative, American spellings:
      , ['meter', 'meters', U.metres(1)]
      , ['centimeter', 'centimeters', U.metres(0.01)]
      , ['kilometer', 'kilometers', U.metres(1000)]

      , ['inch', 'inches', U.metres(0.0254)]
      , ['foot', 'feet', U.metres(12 * 0.0254)]
      , ['yard', 'yards', U.metres(36 * 0.0254)]
      , ['mile', 'miles', U.metres(1609.344)]
    ];
    for (var i=0; i != types.length; ++i) {
        U.addUnitType.apply(U, types[i]);
    }

    return U;
})();
