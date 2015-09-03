"use strict";

(function() {
    var GA = (window.GateArena = window.GateArena || {});

    var objproto = new MajicGame.Sprite;

    GA.Text = function(msgs) {
        this.msgs = msgs;
    };
    GA.Text.prototype = new (function() {
        this.toString = this.toLocaleString = function() {
            if (this.selectedText !== undefined)
                return this.selectedText;
            var langs = ['en-US'];
            if (window.navigator && window.navigator.languages) {
                langs = window.navigator.languages;
            }
            for (var i = 0; i != langs.length; ++i) {
                if (this.msgs[langs[i]] !== undefined)
                    return this.selectedText = this.msgs[langs[i]];
            }
            for (var i = 0; i != langs.length; ++i) {
                var gen = langs[i];
                gen = gen[0] + gen[1];
                if (this.msgs[gen] !== undefined)
                    return this.selectedText = this.msgs[gen];
            }
        };
    })();

    GA.Message = function(msg, info) {
        this.text = msg;

        if (info.size !== undefined)
            this.size = info.size;

        this.draw = GA.art.drawMessage;
    };
    GA.Message.prototype = objproto;

    GA.EnemyGroup = function() {
    };
    GA.EnemyGroup.prototype = [];

    GA.GateGroup = function() {
    };
    GA.GateGroup.prototype = [];

    GA.Background = function() {
        this.draw = GA.art.drawBackground;
    };
    GA.Background.prototype = objproto;
})();
