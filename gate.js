"use strict";

(function() {
    var GA = (window.GateArena ||= {});

    var g = GA.game = new MicahGame();
    var o = GA.obj;

    g.resetThings(
        o.background
      , new o.Message( GA.text.clickMsg, {size: 50})
    );

    var newGame = function(ev) {
        g.removeEventListener('click', newGame);
        GA.player = new GA.obj.Player();
        GA.gates = new o.GateGroup();
        GA.bullets = [];
        GA.enemies = o.EnemyGroup();
        g.resetThings(
            o.background
          , GA.gates
          , [ 'bullets', GA.bullets ]
          , GA.player
          , GA.enemies
        );
    };
    GA.newGame = newGame;

    function p(fnam) {
        return function(ev) {
            if (!GA.game.paused && GA.player.alive)
                GA.player.behavior[fnam]();
        };
    }
    MajicKeys.connect(
        'a',            p('rotateLeft')
      , 'd',            p('rotateRight')
      , 'w',            p('doThrust')
      , 's',            p('doReverse')
      , 'ArrowLeft',    p('rotateLeft')
      , 'ArrowRight',   p('rotateRight')
      , 'ArrowUp',      p('doThrust')
      , 'ArrowDown',    p('doReverse')
      , 'q',            p('moveLeft')
      , 'e',            p('moveRight')
    );
    MajicKeys.onDown(
        'Space',        function(){ GA.player.fire(); }
      , 'p',            function(){ g.pause(); }
    );

    g.addEventListener('click', newGame);

    g.start();
})();
