"use strict";

(function() {
    var GA = (window.GateArena = window.GateArena || {});

    var G = GA.game = new MajicGame();
    var Sp = GA.sprites;

    G.resetSprites(
        Sp.background
      , new GA.Message( GA.text.clickMsg, {size: 40})
    );

    var newGame = function(ev) {
        G.removeEventListener('click', newGame);
        var S = GA.state = {};
        S.player = new Sp.Player();
        S.gates = new GA.GateGroup();
        S.bullets = [];
        S.enemies = new GA.EnemyGroup();
        G.resetSprites(
            Sp.background
          , S.gates
          , S.bullets
          , S.player
          , S.enemies
        );
    };
    GA.newGame = newGame;
    GA.mk = (new MajicKeys).onDown(
        'p',            function() { G.paused = !G.paused; }
    );

    G.addEventListener('click', newGame);

    window.addEventListener('load', G.start.bind(G));
})();
