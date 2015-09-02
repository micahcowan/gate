"use strict";

(function() {
    var GA = (window.GateArena = window.GateArena || {});
    GA.text = {};

    GA.text.Text = function(msgs) {
        this.msgs = msgs;
    };
    GA.text.Text.prototype = new (function() {
        this.toString = this.toLocaleString = function() {
            var langs = ['en-US'];
            if (this.navigator && this.navigator.languages) {
                langs = this.navigator.languages;
            }
            for (var i = 0; i != langs.length; ++i) {
                if (this.msgs[langs[i]] !== undefined)
                    return this.msgs[langs[i]];
            }
            for (var i = 0; i != langs.length; ++i) {
                var gen = langs[i];
                gen = gen[0] + gen[1];
                if (this.msgs[gen] !== undefined)
                    return this.msgs[gen];
            }
        };
    })();

    GA.text.clickMsg = new GA.text.Text({
        'en': 'CLICK TO PLAY'
      , 'ja': 'あそびにクリックして下さい'
    });
})();
