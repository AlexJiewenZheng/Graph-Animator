import {generatePoints} from './Engine.js';

export class Grapher {
    constructor(canvas) {
        this.c = canvas;
        this.ctx = this.c.getContext("2d");

        this.minX = undefined;
        this.maxX = undefined;
        this.minY = undefined;
        this.maxY = undefined;
        this.startX = undefined;
        this.endX = undefined;
        this.graphs = [];
        this.colors = ["#ed2222", "#2222ed", "#22ed22", "#ed8822", "#8822ed"];
        this.animationId = null;
        this.pointIndex = 0;
        this.startTime = null;
        this.toCanvasX = this.toCanvasX.bind(this);
        this.toCanvasY = this.toCanvasY.bind(this);
    }

    toCanvasX(x) {
        return (x-this.minX)/(this.maxX-this.minX)*this.c.width;
    }

    toCanvasY(y) {
        return this.c.height-(y-this.minY)/(this.maxY-this.minY)*this.c.height;
    }

    setBounds(minX, maxX, minY, maxY) {
        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;
    }

    drawGrid(gridStep) {
        this.ctx.clearRect(0, 0, this.c.width, this.c.height);

        this.ctx.strokeStyle = "#444";
        this.ctx.lineWidth = 1;

        this.ctx.beginPath(); // start a new path for the grid lines

        let start = Math.ceil(this.minX/gridStep);
        let end = Math.floor(this.maxX/gridStep);

        // writes path for the vertical grid lines
        for (let i=start; i<=end; i++) {
            const pixelX = this.toCanvasX(i*gridStep);
            this.ctx.moveTo(pixelX, 0);
            this.ctx.lineTo(pixelX, this.c.height);
        }

        start = Math.ceil(this.minY/gridStep);
        end = Math.floor(this.maxY/gridStep);

        // writes path for the horizontal grid line
        for (let i=start; i<=end; i++) {
            const pixelY = this.toCanvasY(i * gridStep); // pixel Y is already converted correctly
            this.ctx.moveTo(0, pixelY);
            this.ctx.lineTo(this.c.width, pixelY);
        }

        this.ctx.stroke(); // draws the path

        // draw the axes
        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 2.5;

        this.ctx.beginPath(); // start a new path for the axes

        if (this.minX <= 0 && this.maxX >= 0) { // check if the X axis needs to be shown
            // writes the path for the X axis
            const canvasOriginX = this.toCanvasX(0);
            this.ctx.moveTo(canvasOriginX, 0);
            this.ctx.lineTo(canvasOriginX, this.c.height);
        }

        if (this.minY <= 0 && this.maxY >= 0) {
            const canvasOriginY = this.toCanvasY(0);
            this.ctx.moveTo(0, canvasOriginY);
            this.ctx.lineTo(this.c.width, canvasOriginY);
        }

        this.ctx.stroke(); // draws the path
    }

    sqGrid(minX, maxX) { // makes the grid perfectly square
        const r = this.c.height/this.c.width; // height to width ratio
        const xRange = maxX-minX;
        const yRange = r*xRange;

        return {
            minY: (-yRange/2).toFixed(2),
            maxY: (yRange/2).toFixed(2)
        };
    }

    animate(timestamp, animationTime) {
        if (this.startTime === null) this.startTime = timestamp; // records the start time on the first frame
        const maxLength = Math.max(...this.graphs.map(g => g.points.length)); 
        if (this.pointIndex >= maxLength) return;

        const elapsed = (timestamp-this.startTime)/1000; // time passed in seconds
        const progress = animationTime>0 ? Math.min(elapsed/animationTime, 1) : 1; // percent of animation finished (0 to 1)
        const end = Math.floor(progress*maxLength); // finds the end index based on elapsed time

        this.graphs.forEach(graph => {
            const points = graph.points;
            if (this.pointIndex >= points.length) return;

            const graphEnd = Math.min(end, points.length);

            this.ctx.strokeStyle = graph.color;
            this.ctx.fillStyle = graph.color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();

            for (let i=this.pointIndex; i<graphEnd; i++) {
                const curr = points[i];
                
                if (curr == null) continue;

                // the pen is lifted every batch
                // so we have to move it back to the last position after every batch
                if (i === this.pointIndex && i > 0 && points[i-1] != null)
                    this.ctx.moveTo(points[i-1].x, points[i-1].y);

                // if the previous point is null or if it is the starting point lift the pen and move to the current point.
                if (i === 0 || points[i-1] == null)
                    this.ctx.moveTo(curr.x, curr.y);
                else // draws the line to the current point
                    this.ctx.lineTo(curr.x, curr.y);
            }

            // draws the paths
            this.ctx.stroke();
        });

        this.pointIndex = end;
        this.animationId = requestAnimationFrame((timestamp) => this.animate(timestamp, animationTime));
    }

    resize(width, height) {
        cancelAnimationFrame(this.animationId);
        this.c.width = width;
        this.c.height = height;
    }

    run(equationsArray, gridStep, animationTime, minX, maxX, minY, maxY, x1, x2) {
        this.setBounds(minX, maxX, minY, maxY);
        this.startX = x1;
        this.endX = x2;

        cancelAnimationFrame(this.animationId);
        this.pointIndex = 0;
        this.startTime = null;
        this.graphs = [];

        this.drawGrid(gridStep);
        
        equationsArray.forEach((eq, index) => {
            const points = generatePoints(
                eq,
                this.minX,
                this.maxX,
                this.startX, 
                this.endX,
                this.c, 
                this.toCanvasX, // passes callback function with parameter included
                this.toCanvasY // same thing here
            );
            
            const color = this.colors[index%this.colors.length]; // choose a color based on the index of the equation
            this.graphs.push({equation:eq, points:points, color:color});
        });
        
        this.animationId = requestAnimationFrame((timestamp) => this.animate(timestamp, animationTime));
    }
}