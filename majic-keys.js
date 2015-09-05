"use strict";

var MajicKeys = function() {
    var MK = this;

    MK.connections = {};
    MK.downs = {};
    MK.ups = {};
    MK.keys = {};

    MK.destroy = function() {
        window.removeEventListener('keydown', MK.handleKeyDown);
        window.removeEventListener('keyup', MK.handleKeyUp);
    };

    MK.connect = function() {
        var alen = arguments.length;
        if (alen % 2 == 1) { --alen; }
        for (var i=0; i < alen; i += 2) {
            var key = arguments[i];
            var fn = arguments[i+1];

            MK.connections[key] = fn;
        }
    };

    // utility function used by .actions() method just below.
    var mkhandler = function(action) {
        return function(e) {
            MK.actionTracker[action] = true;
        };
    };
    MK.actions = function(actions) {
        Object.keys(actions).forEach(function(action) {
            var k = actions[action];
            if (!(k instanceof Array))
                k = [k];
            k.forEach(function(a) {
                MK.connect(a, mkhandler(action));
            });
        });
    };

    MK.onDown = function() {
        var alen = arguments.length;
        if (alen % 2 == 1) { --alen; }
        for (var i=0; i < alen; i += 2) {
            var key = arguments[i];
            var fn = arguments[i+1];

            MK.downs[key] = fn;
        }
    };

    MK.onUp = function() {
        var alen = arguments.length;
        if (alen % 2 == 1) { --alen; }
        for (var i=0; i < alen; i += 2) {
            var key = arguments[i];
            var fn = arguments[i+1];

            MK.ups[key] = fn;
        }
    };

    MK.handleKeyDown = function(e) {
        var keys = MK.getKeys(e);

        for (var i = 0; i < keys.length; ++i) {
            var k = keys[i]
            MK.keys[k] = 1;
            if (MK.downs[k] !== undefined) MK.downs[k](e);
        }

        MK.maybeContinue(keys, e);
    };

    MK.handleKeyUp = function(e) {
        var keys = MK.getKeys(e);

        for (var i = 0; i < keys.length; ++i) {
            var k = keys[i]
            delete MK.keys[k]
            if (MK.ups[k] !== undefined) MK.ups[k](e);
        }

        MK.maybeContinue(keys, e);
    };

    MK.maybeContinue = function(key, e) {
        if (!(e.altKey || e.ctrlKey || e.metaKey)) {
            e.preventDefault();
        }
    };

    MK.getKeys = function(e) {
        // TODO: This needs lots of testing to handle various key event
        // paradigms.
        var key;
        if (e.key !== undefined) {
            key = e.key;
        }
        else if (e.keyIdentifier !== undefined) {
            key = e.keyIdentifier;
            if (key.substr(0,4) == "U+00" && key.length == 6) {
                key = String.fromCharCode(("0x" + key.substr(4,2)) - 0);
            }
        }

        var keys = [];
        if (key == ' ' || key == 'Space') {
            keys.push(' ');
            keys.push('Space');
        }
        else if (key == 'Up' || key == 'Down' || key == 'Left'
                 || key == 'Right') {
            keys.push('Arrow' + key);
        }
        else if (key.length == 1 && key.toLowerCase() != key.toUpperCase()) {
            keys.push(key.toLowerCase());
            keys.push(key.toUpperCase());
        }
        else {
            keys.push(key);
        }
        return keys;
    };

    MK.pulse = function(e) {
        MK.actionTracker = {};
        for (var key in MK.keys) {
            var conn = MK.connections[key];
            if (conn !== undefined && conn !== null) {
                conn(e);
            }
        }
        return MK.actionTracker;
    };

    window.addEventListener('keydown', MK.handleKeyDown);
    window.addEventListener('keyup', MK.handleKeyUp);
};
