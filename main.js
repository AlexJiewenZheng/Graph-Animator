import {Grapher} from './Grapher.js';

const grapher = new Grapher(document.getElementById("graphCanvas"));

const animateBtn = document.getElementById("animateBtn");
const toggleBtn = document.getElementById("toggleControlsBtn");
const controls = document.getElementById("controlsContent");
const squareGridBox = document.getElementById("squareGrid");
const equationsText = document.getElementById("equation");
const gridStepText = document.getElementById("gridStep");
const animationTimeText = document.getElementById("animationTime");
const startXText = document.getElementById("startX")
const endXText = document.getElementById("endX");
const minXText = document.getElementById("minX");
const maxXText = document.getElementById("maxX");
const minYText = document.getElementById("minY");
const maxYText = document.getElementById("maxY");
const modal = document.getElementById("helpModal");
const helpBtn = document.getElementById("helpBtn");
const closeBtn = document.getElementById("closeHelp");

// splits equations by comma, ignores commas inside math functions like nthRoot(x,y)
function split(input) {
    let result = [];
    let curr = '';
    let depth = 0;
    
    for (let i = 0; i < input.length; i++) {
        let char = input[i];
        if (char === '(') depth++;
        if (char === ')') depth--;
        
        if (char === ',' && depth === 0) {
            result.push(curr);
            curr = '';
        } else {
            curr+=char
        }
    }
    result.push(curr);
    // clean whitespace and remove any empty entries
    return result.map(eq => eq.trim()).filter(eq => eq !== '');
}

function sqGridHandler() {
    const minX = parseFloat(minXText.value);
    const maxX = parseFloat(maxXText.value);
    const {minY, maxY} = grapher.sqGrid(minX, maxX);

    minYText.value = minY;
    maxYText.value = maxY;
}

function animateHandler() {
    // hide the settings after click
    controls.classList.add("hidden");
    toggleBtn.innerText = "Show";

    if (squareGridBox.checked) sqGridHandler();

    // because math.js does not handle odd exponents correctly, change it to nthroot instead
    const fixed = document.getElementById("equation").value.replace(/((?:x|\([^)]+\)))\s*\^\s*\(\s*(\d+)\s*\/\s*(\d+)\s*\)/g, (match, base, p, q) => {
        return parseInt(q) % 2 !== 0 ? `nthRoot((${base})^${p}, ${q})` : match;
    });

    const equations = split(fixed);

    const gridStep = parseFloat(gridStepText.value);
    const animationTime = parseFloat(animationTimeText.value);

    const startX = parseFloat(startXText.value);
    const endX = parseFloat(endXText.value);
    const minX = parseFloat(minXText.value);
    const maxX = parseFloat(maxXText.value);
    const minY = parseFloat(minYText.value);
    const maxY = parseFloat(maxYText.value);


    if (minX >= maxX || minY >= maxY) {
        alert("Invalid Axis Bounds. Min values must be less than max values");
        return;
    }

    if (isNaN(animationTime) || animationTime < 0) {
        alert("Invalid animation time");
        return;
    }

    if (startX >= endX) {
        alert("Invalid interval to graph. Starting x must be less than ending x");
        return;
    }

    if (equations.some(eq => eq === "")) {
        alert("Check your equation box again!");
        return;
    }

    grapher.run(equations, gridStep, animationTime, minX, maxX, minY, maxY, startX, endX);
}

function resizedEvent() {
    const gridStepVal = parseFloat(document.getElementById("gridStep").value);
    grapher.resize(window.innerWidth, window.innerHeight);

    if (squareGridBox.checked) sqGridHandler();

    const minX = parseFloat(minXText.value);
    const maxX = parseFloat(maxXText.value);
    const minY = parseFloat(minYText.value);
    const maxY = parseFloat(maxYText.value);

    grapher.setBounds(minX, maxX, minY, maxY);
    grapher.drawGrid(gridStepVal);
}

window.addEventListener("resize", resizedEvent);

toggleBtn.addEventListener("click", () => { // show/hide button
    controls.classList.toggle("hidden");
    if(controls.classList.contains("hidden"))
        toggleBtn.innerText = "Show";
    else
        toggleBtn.innerText = "Hide";
});

squareGridBox.addEventListener("change", (event) => { // square grid checkbox
    if (event.target.checked) sqGridHandler();
});

animateBtn.addEventListener("click", animateHandler); // animate click

helpBtn.addEventListener("click", () => {
    modal.style.display = "flex";
});

closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
});

document.addEventListener("DOMContentLoaded", () => {
    resizedEvent();
    modal.style.display = "flex";
});
