"use strict";

(function() {
    var GA = (window.GateArena = window.GateArena || {});
    var G = MajicGame;
    var U = MajicUnits;
    var B = MajicGame.behavior;
    var sprites = GA.sprites = {};

    sprites.background = new GA.Background();

    sprites.Player = G.makeSpriteClass({
        size: U.pixels( 12 )
      , hitPoints: 3
      , rot: U.radians( Math.PI /4 )
      , h: U.pixels( 10 ).per.second
      , v: U.pixels( 10 ).per.second

      , behavior: [
            B.momentum
          , B.friction(  U.pixels( 2 ).per.second.per.second  )
          , B.rotateKeys(
                {
                    clock:   [ 'd', 'ArrowRight' ]
                  , counter: [ 'a', 'ArrowLeft' ]
                }
              , U.radians( Math.PI ).per.second
                )
          , B.thrustKeys({
                    forward: [ 'w', 'ArrowUp' ]
                  , back:    [ 's', 'ArrowDown' ]
                  , left:    'q'
                  , right:   'e'
                }
              , U.pixels( 6 ).per.second.per.second
                )
        /*
          , B.death
         */
            ]

      , draw: GA.art.drawPlayer
    },
    function(){
        this.mergeData({
            x: GateArena.game.width.div(2).relax()
          , y: GateArena.game.height.div(2).relax()
        });
    });
})();
