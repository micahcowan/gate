"use strict";

(function() {
    var GA = (window.GateArena = window.GateArena || {});

    var objproto = new MicahGame.Thing;

    GA.Message = function(msg, info) {
        this.text = msg;

        if (info.size !== undefined)
            this.size = info.size;

        this.draw = GA.art.drawMessage;
    };
    GA.Message.prototype = objproto;

    GA.Background = function() {
        this.draw = GA.art.drawBackground;
    };
    GA.Background.prototype = objproto;
})();
