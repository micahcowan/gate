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
        /*
      , rot: U.radians( Math.PI /4 )
      , h: U.pixels( 50 ).per.second
      , v: U.pixels( 50 ).per.second
      */

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
              , U.pixels( 6 * 50 ).per.second.per.second
                )
          , B.friction(  U.pixels( 2 * 50 ).per.second.per.second  )
          , B.speedLimited( U.pixels( 240 ).per.second )
          , // Bounds. FIXME: this should be a collision relationship
            function(delta) {
                var x = this.x.as( U.pixel );
                var y = this.y.as( U.pixel );
                var w = GA.game.width.as( U.pixel );
                var h = GA.game.height.as( U.pixel );
                if (x < 0) {
                    this.x = this.x.mul(-1);
                    this.h = this.h.mul(-1);
                }
                else if (x > w) {
                    this.x = this.x.sub( U.pixels( 2 * (x-w) ) );
                    this.h = this.h.mul(-1);
                }

                if (y < 0) {
                    this.y = this.y.mul(-1);
                    this.v = this.v.mul(-1);
                }
                else if (y > h) {
                    this.y = this.y.sub( U.pixels( 2 * (y-h) ) );
                    this.v = this.v.mul(-1);
                }

                this.x.relax();
                this.y.relax();
            }
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
