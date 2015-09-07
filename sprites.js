"use strict";

(function() {
    var GA = (window.GateArena = window.GateArena || {});
    var sprites = GA.sprites = {};
    // Delaying sprites setup allows us to refer to game properties
    // (like game height/weight) after the MajicGame object is
    // instantiated.
    GA.setupSprites = function() {

    var G = MajicGame;
    var U = MajicUnits;
    var B = MajicGame.behavior;

    sprites.background = new GA.Background();

    sprites.Player = G.makeSpriteClass({
        size: U.pixels( 12 )
      , hitPoints: 3

      , behavior: [
            B.momentum
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
              , U.pixels( 300 ).per.second.per.second
                )
          , B.friction(  U.pixels( 100 ).per.second.per.second  )
          , B.speedLimited( U.pixels( 240 ).per.second )
          , B.bouncingBounds(
                  GA.game.width, GA.game.height,
                  // Play "clink" when we bounce off a wall
                  function(){ createjs.Sound.play('bounce') }
            )
            ]

      , draw: GA.art.drawPlayer
    });

    return GA.sprites;
    }; // end setupSprites()
})();
