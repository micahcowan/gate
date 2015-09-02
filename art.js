"use strict";

(function() {
    var GA = (window.GateArena = window.GateArena || {});
    GA.art = {};

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
        if (window.Units !== undefined) // FIXME: Implement Units
            offset = Units.now().mul(moveSpeed).asUnit() % gridSize;
        else
            offset = (new Date() / 1000) * moveSpeed % gridSize;

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
})();
