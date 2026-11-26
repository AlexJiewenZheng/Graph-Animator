/*
const c = document.getElementById("graphCanvas");
const ctx = c.getContext("2d");

const animateBtn = document.getElementById("animateBtn");
const toggleBtn = document.getElementById("toggleControlsBtn");
const controls = document.getElementById("controlsContent");
const squareGridBox = document.getElementById("squareGrid");

let minX, maxX, minY, maxY, points, animationId, pointIndex = 0;

function toCanvasX(x) {
    const p = (x-minX)/(maxX-minX); // where the coordinate is as a percent of the whole x axis of the canvas
    return p*c.width;
}

function toCanvasY(y) {
    const p = (y-minY)/(maxY-minY);
    return c.height-p*c.height;
}

function drawGrid(gridStep) {
    ctx.clearRect(0, 0, c.width, c.height);

    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;

    ctx.beginPath(); // start a new path for the grid lines

    let start = Math.ceil(minX/gridStep);
    let end = Math.floor(maxX/gridStep);

    // writes path for the vertical grid lines
    for (let i=start; i<=end; i++) {
        const pixelX = toCanvasX(i*gridStep);
        ctx.moveTo(pixelX, 0);
        ctx.lineTo(pixelX, c.height);
    }

    start = Math.ceil(minY/gridStep);
    end = Math.floor(maxY/gridStep);

    // writes path for the horizontal grid line
    for (let i=start; i<=end; i++) {
        const pixelY = toCanvasY(i*gridStep); // pixel Y is already converted correctly
        ctx.moveTo(0, pixelY);
        ctx.lineTo(c.width, pixelY);
    }

    ctx.stroke(); // draws the path

    // draw the axes
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2.5;

    ctx.beginPath(); // start a new path for the axes

    if (minX <= 0 && maxX >= 0) { // check if the X axis needs to be shown
        // writes the path for the X axis
        const canvasOriginX = toCanvasX(0);
        ctx.moveTo(canvasOriginX, 0);
        ctx.lineTo(canvasOriginX, c.height);
    }

    if (minY <= 0 && maxY >= 0) {
        const canvasOriginY = toCanvasY(0);
        ctx.moveTo(0, canvasOriginY);
        ctx.lineTo(c.width, canvasOriginY);
    }

    ctx.stroke(); // draws the path

}

function resizeCanvas() {
    cancelAnimationFrame(animationId);
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    if (squareGridBox.checked) sqGrid();
    drawGrid(parseFloat(document.getElementById("gridStep").value));
    animateHandler()
}

function sqGrid() { // makes the grid perfectly square
    const r = c.height/c.width;
    const minXInput = parseFloat(document.getElementById("minX").value);
    const maxXInput = parseFloat(document.getElementById("maxX").value);

    const xRange = maxXInput - minXInput;
    const yRange = r * xRange;

    document.getElementById("minY").value = (-yRange/2).toFixed(2);
    document.getElementById("maxY").value = (yRange/2).toFixed(2);
    
}

function animate(animationTime) {
    if (pointIndex >= points.length) return;

    // #frames = animationTime*60fps
    // #batches = #points/#frames
    const batch = Math.ceil(points.length/animationTime/60); // batch size
    const end = Math.min(pointIndex+batch, points.length); // finds the end of the batch

    ctx.strokeStyle = "#ed2222";
    ctx.fillStyle = "#ed2222";
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = pointIndex; i < end; i++) {
        const curr = points[i];
        
        if (curr == null) continue;

        // the pen is lifted every batch
        // so we have to move it back to the last position after every batch
        if (i === pointIndex && i > 0 && points[i-1] != null)
            ctx.moveTo(points[i-1].x, points[i-1].y);

        // if the previous point is null or if it is the starting point lift the pen and move to the current point.
        if (i === 0 || points[i-1] == null)
            ctx.moveTo(curr.x, curr.y);
        else // draws the line to the current point
            ctx.lineTo(curr.x, curr.y);
    }

    // draws the paths
    ctx.stroke();

    pointIndex = end;
    animationId = requestAnimationFrame(() => animate(animationTime));
}

function generatePoints(equation) {
    let points = [];
    let compiledEq;

    try {
        compiledEq = math.compile(equation);
    } catch (error) {
        alert("Check your equation again. It is invalid.");
        return points;
    }

    function evalExp(xVal) {
        try {
            return compiledEq.evaluate({ x: xVal });
        } catch (e) {
            return NaN;
        }
    }

    let xVals = [];
    // let the step size
    const stepSize = (maxX-minX)/c.width; // in math units per pixel

    // this will loop through half the number of pixels on the interval
    // looping through all the pixels on the interval is also fine, but since we are using a bisection algorithm it ends up checking all the pixels in between
    for (let x=minX; x<=maxX; x+=2*stepSize) xVals.push(x);

    // due to integer division, it can leave off a pixel so we check to add it back
    if (xVals[xVals.length-1] !== maxX) xVals.push(maxX);

    // some x values can produce invalid y values. the recursive algorithm below uses bisection + divide/conquer to work around this
    function bisect(x1, y1, px1, py1, x2, y2, px2, py2, depth) { // takes in data for 2 consecutive points
        if (depth >= 10) return [];

        // compute the middle point between the 2 points
        const xMid = (x1+x2)/2;
        const yMid = evalExp(xMid);
        const pxMid = toCanvasX(xMid);
        const pyMid = isNaN(yMid) ? NaN:toCanvasY(yMid);

        let divide = false;

        if (isNaN(y1) !== isNaN(yMid) || isNaN(y2) !== isNaN(yMid)) { // checks whether y1, y2 with yMid. Only flags divide when the two are different (basically the xor operator)
            divide = true; 
        } else if (!isNaN(y1) && !isNaN(y2) && !isNaN(yMid)) { // if all points are valid
            const predict = (py1+py2)/2;
            if (Math.abs(pyMid-predict) > 0.5) { // check if the difference between actual and predicted is greater than 0.5 pixels. If it is, it means there is a bend and we flag divide to smooth it
                divide = true;
            }
        }

        if (divide) {
            const left = bisect(x1, y1, px1, py1, xMid, yMid, pxMid, pyMid, depth+1);
            const right = bisect(xMid, yMid, pxMid, pyMid, x2, y2, px2, py2, depth+1);
            return [...left, {x:pxMid, y:pyMid}, ...right]; // returns and merges all the subpoints into a list
        }
        return [];
    }

    const all = []; // stores all the points and subpoints after running the algorithm. the data are in pixels

    for (let i=0; i<xVals.length-1; i++) {
        const x1 = xVals[i];
        const y1 = evalExp(x1);
        const px1 = toCanvasX(x1);
        const py1 = isNaN(y1) ? NaN:toCanvasY(y1);

        if (i === 0) all.push({x:px1, y:py1});

        const x2 = xVals[i+1];
        const y2 = evalExp(x2);
        const px2 = toCanvasX(x2);
        const py2 = isNaN(y2) ? NaN:toCanvasY(y2);
        
        all.push(...bisect(x1, y1, px1, py1, x2, y2, px2, py2, 0)); // adds all the subpoints between the 2 points
        all.push({ x: px2, y: py2 }); // adds the second point
    }

    let prev = null;
    
    for (const pt of all) {
        if (isNaN(pt.y)) { // if the point is invalid
            points.push(null);
            prev = null;
            continue;
        }

        // optimizations

        // this limits the y coordinate to at most 2 screens above or below the screen
        let limitY = pt.y;
        if (pt.y < -c.height*2) limitY = -c.height*2;
        else if (pt.y > c.height*3) limitY = c.height*3;
        
        const curr = {x:pt.x, y:limitY};

        if (prev != null) {
            // frustum culling. we do not need to add points off screen to our drawing list
            if (curr.y<0 && prev.y<0 || curr.y>c.height && prev.y>c.height) {
                prev = curr;
                continue;
            }
            // checks if the prev is off screen and that prev is not already on the list.
            if ((prev.y<0 || prev.y > c.height) && points[points.length-1] !== prev) {
                points.push(prev); // re-add the prev to the points list
            }

            // check if there is a vertical asymptote (using heuristics)
            const dx = Math.abs(curr.x-prev.x);
            const dy = Math.abs(curr.y-prev.y);
            
            const isAsymptote = dy>c.height*0.3 && (dy/Math.max(dx, 0.01)>100);

            if (isAsymptote) points.push(null); // Add a null point so no line will be connected from prev to curr
        }

        points.push(curr);
        prev = curr;
    }
    
    return points;
}

function animateHandler() {
    // hide the settings after click
    document.getElementById("controlsContent").classList.add("hidden");
    document.getElementById("toggleControlsBtn").innerText = "Show";

    const equation = document.getElementById("equation").value;
    const gridStep = parseFloat(document.getElementById("gridStep").value);
    const animationTime = parseFloat(document.getElementById("animationTime").value);

    minX = parseFloat(document.getElementById("minX").value);
    maxX = parseFloat(document.getElementById("maxX").value);
    minY = parseFloat(document.getElementById("minY").value);
    maxY = parseFloat(document.getElementById("maxY").value);


    if (minX >= maxX || minY >= maxY) {
        alert("Invalid Axis Scaling. Min values must be less than max values");
        return;
    }

    if (isNaN(animationTime) || animationTime < 0) {
        alert("Invalid animation time");
        return;
    }

    cancelAnimationFrame(animationId); // stop the current animation
    pointIndex = 0; // set the pointIndex back to the very start

    drawGrid(gridStep);
    points = generatePoints(equation);
    animate(animationTime);
}


resizeCanvas();
window.addEventListener("resize", resizeCanvas); // resizes the canvas when user resizes the window

toggleBtn.addEventListener("click", () => {
    controls.classList.toggle("hidden");
    if(controls.classList.contains("hidden")) {
        toggleBtn.innerText = "Show";
    } else {
        toggleBtn.innerText = "Hide";
    }
});

squareGridBox.addEventListener("change", (event) => {
    if (event.target.checked) sqGrid();
});

animateBtn.addEventListener("click", animateHandler);

*/