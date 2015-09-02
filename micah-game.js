"use strict";

function MicahGame() {
    var MG = this;
    var _things;

    this.resetThings = function() {
        _things = new Array(arguments.length);
        _things.push.apply(_things, arguments);
    };
}
MicahGame.Thing = function() {
};
