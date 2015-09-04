"use strict";

window.addEventListener('load', function() {
    var GA = (window.GateArena = window.GateArena || {});

    var G = GA.game = new MajicGame(document.getElementById('game'));
    var Sp = GA.sprites;

    G.resetSprites(
        Sp.background
      , new GA.Message( GA.text.clickMsg, {size: 40})
    );

    var newGame = function(ev) {
        G.removeEventListener('click', newGame);
        var S = GA.state = {};
        S.player = new Sp.Player(G.center);
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
    GA.mk = new MajicKeys;
    GA.mk.onDown(
        'p', function() { G.paused = !G.paused; }

        // Fullscreen support:
      , 'f', function() {
                 var c = document.getElementById('gameContainer');
                 if (c.requestFullScreen) {
                     c.requestFullScreen();
                 }
                 else {
                     // Find which of mozRequestFullScreen, etc is
                     // available, and then call it.
                     var done = false;
                     ['moz','webkit','ms'].forEach(function(pfx){
                         var fn = c[pfx + 'RequestFullScreen'];
                         if (fn) {
                             fn.bind(c)();
                             done = true;
                         }
                     });
                 }
             }
    );

    G.addEventListener('click', newGame);

    G.start();
});
