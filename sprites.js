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

    var DEFAULT_BULLET_SPEED = U.pixels( 300 ).per.second;

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

              , speed:          DEFAULT_BULLET_SPEED
              , color:          'red'
              , onBounce:       [
                    GA.maybeLockGate
                  , GA.soundPlayer('knock')
                ]
            })
          , Bh.friction(  U.pixels( 100 ).per.second.per.second  )
          , Bh.speedLimited( U.pixels( 240 ).per.second )
          , Bh.bouncingBounds(
                  U.pixels( 0 ), U.pixels( 0 ),
                  GA.game.width, GA.game.height,
                  // Play "clink" when we bounce off a wall
                  GA.maybeTeleportGate
            )
        ]

      , draw: GA.art.drawPlayer
    });

    var baddySize = U.pixels( 32 );
    var halfSize = baddySize.as( U.pixels ) / 2;

    sprites.BasicBaddy = MajicGame.makeSpriteClass({
        size: baddySize
      , speed: U.pixels( 70 ).per.second

      , minWaitChDir: U.seconds( 3 )
      , maxWaitChDir: U.seconds( 5 )

      , minWaitShot:  U.seconds( 1 )
      , maxWaitShot:  U.seconds( 6 )

      , maxRotate: U.radians( Math.PI * 3/5 ).per.second
      , lanceSize: U.pixels( 60 )

      , behavior: [
            Bh.boundedLanceWandering(
                halfSize, halfSize,
                GA.game.width - halfSize, GA.game.height - halfSize
            )
        ]

      , draw: GA.art.drawBaddie
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
