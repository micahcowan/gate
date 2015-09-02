"use strict";

(function() {
    var GA = (window.GateArena = window.GateArena || {});
    var O = GA.obj = {};

    var objproto = new MicahGame.Thing;

    O.Message = function(msg, info) {
        this.text = msg;

        if (info.size !== undefined)
            this.size = info.size;

        this.draw = GA.art.drawMessage;
    };
    O.Message.prototype = objproto;

    O.Background = function() {
        this.draw = GA.art.drawBackground;
    };
    O.Background.prototype = objproto;

    O.background = new O.Background();
})();
