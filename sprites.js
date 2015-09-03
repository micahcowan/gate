"use strict";

(function() {
    var GA = (window.GateArena = window.GateArena || {});
    var U = MajicUnits;
    var B = MajicGame.behavior;
    var sprites = GA.sprites = {};
    var objproto = new MajicGame.Sprite;

    sprites.background = new GA.Background();

    sprites.Player = makeSpriteClass({
        size: U.pixels( 12 )
      , x: GateArena.game.width / 2
      , y: GateArena.game.height / 2 
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
    });
})();
