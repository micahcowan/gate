"use strict";

(function() {
    var GA = (window.GateArena = window.GateArena || {});
    var U = MajicUnits;
    GA.art = {};

    GA.art.shadow = function() {
        GA.game.screen.shadowColor = 'rgba(0,0,0,0.3)';
        GA.game.screen.shadowOffsetX = 5;
        GA.game.screen.shadowOffsetY = 5;
        GA.game.screen.shadowBlur = 4.2;
    };

    // NOTE: In all the draw*() functions below, "this" refers to an
    // whatever object has adopted it as a method, and NOT the
    // surrounding context.

    GA.art.drawBackground = function(s) {
        s.fillStyle = this.fillStyle || "#EEE";
        s.fillRect(0, 0, s.canvas.width, s.canvas.height);

        // Draw grid.
        var gridSize = this.gridSize || 42;
        var moveSpeed = this.moveSpeed || (gridSize / 4.0);
        s.lineWidth = this.lineWidth || 1;
        s.strokeStyle = this.strokeStyle || "#C0C0D0";

        var offset;
        offset = (new Date() / 1000) * moveSpeed % gridSize; // Use MajicUnits

        var width = s.canvas.width;
        var height = s.canvas.height;
        for (var x = offset; x < width; x += gridSize) {
            s.beginPath();
            s.moveTo(x,0);
            s.lineTo(x,height);
            s.stroke();
        }
        for (var y = offset; y < height; y += gridSize) {
            s.beginPath();
            s.moveTo(0,y);
            s.lineTo(width,y);
            s.stroke();
        }
    };

    GA.art.drawMessage = function(s) {
        var G = GA.game;
        var msg = this.text;
        var size = this.size || 20;
        var x = this.x || G.width/2;
        var y = this.y || G.height/2;
        s.font = size + 'px Arial Black, Helvetica, sans-serif';
        s.lineWidth = 5;
        s.lineJoin = 'round';
        s.textAlign = 'center';
        s.strokeStyle = 'white';
        s.fillStyle = 'black';
        s.strokeText(msg, x, y);
        s.fillText(msg, x, y);
    };

    GA.art.drawPlayer = function(s) {
        var p = this;

        /*
        if (p.hitPoints == 0 && GG.state.gameTime - p.killedTime > GA.BADDIE_DEATH_TIME)
            return;
        */

        var r = p.size.as( U.pixel );
        /*
        if (p.hitPoints == 0) {
            r += 20 * (GG.state.gameTime - p.killedTime) / GA.BADDIE_DEATH_TIME;
        }
        */

        s.beginPath();
        var x0 = 0;
        var y0 = - r * 4/3;
        var x1 = + r * Math.sin(2/3 * Math.PI);
        var y1 = - r * Math.cos(2/3 * Math.PI);
        var x2 = + r * Math.sin(4/3 * Math.PI);
        var y2 = - r * Math.cos(4/3 * Math.PI);
        s.save();
        s.translate(p.x, p.y);
        s.rotate(p.rot.as( U.radian ));
        s.moveTo(x0, y0);
        s.bezierCurveTo(x0, y0, x1, y1-r*3/4, x1, y1+r/3);
        s.bezierCurveTo(x1, y1, x2, y2, x2, y2+r/3);
        s.bezierCurveTo(x2, y2-r*3/4, x0, y0, x0, y0);
        s.strokeStyle = "black";
        s.lineWidth = 2;
        s.lineJoin = "miter";
        s.fillStyle = "red";
        if (p.hitPoints == 0) {
            var percent = (GG.state.gameTime - p.killedTime) /
                                GA.BADDIE_DEATH_TIME;
            var alpha = 1 - percent;
            s.fillStyle = 'rgba(128,0,0,' + alpha + ')';
            s.save();
            s.fill();
            s.restore();
        }
        else if (true || !GG.state.shot.fired) {
            s.save();
            GA.art.shadow();
            s.fill();
            s.restore();
            s.stroke();
        }
        else {
            GA.art.shadow();
            s.stroke();
        }
        s.restore();
    };
})();
