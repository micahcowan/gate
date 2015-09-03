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
      , rot: U.radians( Math.PI /4 ).per.second
      , vel: U.pixels( 10 ).per.second

      , behavior: [
            B.friction(  U.pixels( 2 ).per.second.per.second  )
        /*
          , B.death
          , B.thrustKeys(
                [
                    [ 'w', 'ArrowUp' ]
                  , [ 's', 'ArrowDown' ]
                  , [ 'q', 'ArrowLeft' ]
                  , [ 'e', 'ArrowRight' ]
                ]
              , U.pixels( 6 ).per.second.per.second)
                )
          , B.rotateKeys("da", U.radians( Math.PI ).per.second)
         */
            ]

      , draw: GA.art.drawPlayer
    },
    function(){
        this.mergeData({
            x: GateArena.game.width / 2
          , y: GateArena.game.height / 2
        });
    });
})();
