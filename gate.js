"use strict";

(function() {
    var GA = (window.GateArena = window.GateArena || {});

    var G = GA.game = new MajicGame();
    var Sp = GA.sprites;

    G.resetThings(
        Sp.background
      , new GA.Message( GA.text.clickMsg, {size: 40})
    );

    var newGame = function(ev) {
        G.removeEventListener('click', newGame);
        var S = GA.state = {};
        S.player = new Sp.Player();
        S.gates = new GA.GateGroup();
        S.bullets = [];
        S.enemies = GA.EnemyGroup();
        G.resetThings(
            Sp.background
          , GA.gates
          , GA.bullets
          , GA.player
          , GA.enemies
        );
    };
    GA.newGame = newGame;
    MajicKeys.onDown(
        'p',            function() { G.pause(); }
    );

    G.addEventListener('click', newGame);

    window.addEventListener('load', G.start.bind(G));
})();
