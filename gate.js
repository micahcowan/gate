"use strict";

(function() {
    var GA = (window.GateArena ||= {});

    var G = GA.game = new MicahGame();
    var O = GA.obj;

    G.resetThings(
        O.background
      , new O.Message( GA.text.clickMsg, {size: 50})
    );

    var newGame = function(ev) {
        G.removeEventListener('click', newGame);
        GA.player = new GA.obj.Player();
        GA.gates = new O.GateGroup();
        GA.bullets = new O.BulletGroup();
        GA.enemies = O.EnemyGroup();
        G.resetThings(
            O.background
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

    G.start();
})();
