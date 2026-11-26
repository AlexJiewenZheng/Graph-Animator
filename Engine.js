// optimization, store already compiled equations
const cache = new Map();

export function generatePoints(equation, minX, maxX, startX, endX, c, toCanvasX, toCanvasY) {
    function evalExp(xVal) {
        try {
            return compiledEq.evaluate({ x: xVal });
        } catch (e) {
            return NaN;
        }
    }

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
    
    let points = [];
    let compiledEq = cache.get(equation);

    try {
        if (!compiledEq) {
            compiledEq = math.compile(equation);
            cache.set(equation, compiledEq);
        }
    } catch (error) {
        alert("Check your equation again. It is invalid.");
        return points;
    }

    let xVals = [];
    const stepSize = (maxX-minX)/c.width; // in math units per pixel

    // this will loop through half the number of pixels on the interval
    // looping through all the pixels on the interval is also fine, but since we are using a bisection algorithm it ends up checking all the pixels in between
    for (let x=startX; x<=endX; x+=2*stepSize) xVals.push(x);

    // due to integer division, it can leave off a pixel so we check to add it back
    if (xVals[xVals.length-1] !== maxX) xVals.push(endX);

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
        all.push({x:px2, y:py2}); // adds the second point
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

            // check if there is a vertical asymptote (heuristics)
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