"use strict";

var MajicUnits = (function() {
    var _U = function() {};
    var UnitsTopProto = {};
    _U.prototype = UnitsTopProto;
    var U = new _U;

    var UnitValue = function(value, numUnits, denomUnits) {
        // XXX: should protect num/denom by setting all their properties
        // read-only
        this._value = value;
        this._numUnits = numUnits;
        this._denomUnits = denomUnits;
    };
    UnitValue.prototype = {
        mul:
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

                    return new UnitValue(this._value * x._value, newNum, newDenom);
                }
                else {
                    return new UnitValue(this._value * x, this._numUnits, this._denomUnits);
                }
            }
      , get per() {
                return new UnitPer(this);
            }
      , get as() {
                // return new UnitAs(this);
                return new UnitPer(this);
            }
      , valueOf:
            function() {
                if (Object.keys(this._numUnits).length == 0 && Object.keys(this._denomUnits).length == 0) {
                    return this._value;
                }
                else {
                    throw "Can't produce a value: nums " + this._numUnits.toString() + ", denoms " + this._denomUnits;
                }
            }
      , toString:
            function() {
                return this._value.toString() + this.typeTag();
            }
      , typeTag:
            function() {
                var nums = Object.keys(this._numUnits).sort();
                var denoms = Object.keys(this._denomUnits).sort();
                var ret = "";

                if (nums.length == 0 && denoms.length == 0)
                    return ret;

                function t(n, count) {
                    n.map(function(x) {
                        var tag = unitTypes[x].nick;
                        if (count[x] > 1) {
                            tag += count[x].toString();
                        }
                        return tag;
                    }).forEach(function(x) { ret += x });
                }
                if (nums.length == 0) {
                    ret += " 1";
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

    var UnitPer = function(unitValue) {
        this.unitValue = unitValue;
    };
    UnitPer.prototype = {
    };

    var UnitAs = function(unitValue) {
        this.unitValue = unitValue;
    };
    UnitAs.prototype = {
    };

    var unitTypes = {};

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

    UnitsTopProto.addUnitType = function(typeAry) {
        var label = typeAry[0];
        var plural = label + (label.endsWith('s')? 'es' : 's');

        var type = {
            label: label,
            nick:  typeAry[1],
        };

        // Register type
        if (label == 'unit' || unitTypes[label]) {
            throw "Unit type \"" + label + "\" already exists";
        }
        unitTypes[label] = type;

        // Add properties to top-level object's prototype
        var um;
        if (typeAry.length > 2) {
            type.equiv = typeAry[2];
            um = unitMaker(type.equiv);
        } else {
            um = unitMaker(label);
        }
        UnitsTopProto[plural] = um;
        Object.defineProperty(UnitsTopProto, label, {
            get: function() { return um(1); }
        });

        // Add properties to .per
        UnitPer.prototype[plural] = function(x) {
            var d = {};
            d[label] = 1;
            return this.unitValue.mul(new UnitValue(1 * x, {}, d));
        };
        Object.defineProperty(UnitPer.prototype, label, {
            get: function() {
                     return this[plural](1);
                 }
        });

        if (false) {
        // Add properties to .as
        UnitAs.prototype[plural] = function(x) {
            return this.unitValue.mul(new Unit(1 * x, {}, {label}));
        };
        Object.defineProperty(UnitAs.prototype, label, {
            get: function(x) {
                     return this[plural](1);
                 }
        });
        }
    };

    var types = [
        ['pixel', 'px']
      , ['radian', 'rad']
      , ['second', 's']
    ];
    for (var i=0; i != types.length; ++i) {
        U.addUnitType(types[i]);
    }

    U.addUnitType(['millisecond', 'ms', U.seconds(0.001)]);

    return U;
})();
