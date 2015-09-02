"use strict";

(function() {
    var GA = (window.GateArena = window.GateArena || {});

    var G = GA.game = new MicahGame();
    var M = GA.mobs;

    G.resetThings(
        M.background
      , new GA.Message( GA.text.clickMsg, {size: 50})
    );

    var newGame = function(ev) {
        G.removeEventListener('click', newGame);
        GA.player = new GA.Player();
        GA.gates = new GA.GateGroup();
        GA.bullets = [];
        GA.enemies = GA.EnemyGroup();
        G.resetThings(
            M.background
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
