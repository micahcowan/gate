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
    var Bh = MajicGame.behavior;
    var GABh = GateArena.behavior;

    sprites.background = new GA.Background();

    sprites.Player = G.makeSpriteClass({
        size: U.pixels( 12 )
      , hitPoints: 3

      , behavior: [
            Bh.momentum
          , Bh.rotateKeys(
                {
                    clock:   [ 'd', 'ArrowRight' ]
                  , counter: [ 'a', 'ArrowLeft' ]
                }
              , U.radians( Math.PI ).per.second
            )
          , Bh.thrustKeys(
                {
                    forward: [ 'w', 'ArrowUp' ]
                  , back:    [ 's', 'ArrowDown' ]
                  , left:    'q'
                  , right:   'e'
                }
              , U.pixels( 300 ).per.second.per.second
            )
          , GABh.playerBullet({
                trigger:        'Space'

              , speed:          U.pixels( 300 ).per.second
              , color:          'red'
              , onBounce:       [
                    GA.maybeLockGate
                  , GA.soundPlayer('knock')
                ]
            })
          , Bh.friction(  U.pixels( 100 ).per.second.per.second  )
          , Bh.speedLimited( U.pixels( 240 ).per.second )
          , Bh.bouncingBounds(
                  GA.game.width, GA.game.height,
                  // Play "clink" when we bounce off a wall
                  [
                      GA.maybeTeleportGate
                    , GA.soundPlayer('bounce')
                  ]
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
            GABh.bulletFiredBehavior
          , GABh.bulletBoundsRecall( GA.game.width, GA.game.height )
          , GABh.bulletRecallBehavior({
                onSlurp: GA.soundPlayer('slurp')
            })
        ]
      , initSprite: function(owner, data) {
            this.owner = owner;
            this.mergeData( data );
        }
    }, GA.BulletProtoClass // prototype to provide .fire() and other methods.
    );

    sprites.Gate = MajicGame.makeSpriteClass({
        size: U.pixels( 64 )
      , draw: GA.art.drawGate
      , open: false
    }, GA.GateProtoClass);

    return sprites;
    }; // end setupSprites()
})();
