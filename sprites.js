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
          , B.thrustKeys(
                {
                    forward: [ 'w', 'ArrowUp' ]
                  , back:    [ 's', 'ArrowDown' ]
                  , left:    'q'
                  , right:   'e'
                }
              , U.pixels( 300 ).per.second.per.second
            )
          , GA.behavior.playerBullet({
                trigger:        'Space'

              , speed:          U.pixels( 300 ).per.second
              , color:          'red'
              , onBounce:       GA.soundPlayer('knock'),
            })
          , B.friction(  U.pixels( 100 ).per.second.per.second  )
          , B.speedLimited( U.pixels( 240 ).per.second )
          , B.bouncingBounds(
                  GA.game.width, GA.game.height,
                  // Play "clink" when we bounce off a wall
                  GA.soundPlayer('bounce')
            )
        ]

      , draw: GA.art.drawPlayer
    });

    sprites.Bullet = MajicGame.makeSpriteClass({
        draw: GA.art.drawBullet
      , owner: undefined // provided by owner's behavior
      , onFire: GA.soundPlayer('shot')
      , firedRadius: U.pixels( 4 )
      , recallRadius: U.pixels( 7 )
      , firingTime: U.seconds( 1/3 )
      , behavior: [
            GA.behavior.bulletFiredBehavior
          , GA.behavior.bulletBoundsRecall( GA.game.width, GA.game.height )
          , GA.behavior.bulletRecallBehavior({
                onSlurp: GA.soundPlayer('slurp')
            })
        ]
      , initSprite: function(owner, data) {
            this.owner = owner;
            this.mergeData( data );
        }
    }, GA.bulletProtoClass // prototype to provide .fire() and other methods.
    );

    sprites.Gate = MajicGame.makeSpriteClass({
        size: U.pixels( 64 )
      , draw: GA.art.drawGate
      , open: true // XXX
    });

    return sprites;
    }; // end setupSprites()
})();
