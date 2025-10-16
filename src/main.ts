"use strict";

// Import assets
import "./style.css";

// Set up the HTML structure
document.body.innerHTML = `
  <h1 class="title">Sketchpad</h1>

  <canvas class="canvas" id="sketchpad" width="256" height="256"></canvas>

  <div class="button-container">
    <button class="button" id="clear">Clear</button>
  </div>
`;

// Create a canvas element and add it to the body
const canvas = document.getElementById("sketchpad") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const cursor = { active: false, x: 0, y: 0 };

const event = new EventTarget();

// Store drawn lines
type Point = { x: number; y: number };
const lines: Point[][] = [];

let thisLine: Point[] | null = null;

// Set up canvas context
ctx.lineWidth = 2;
ctx.lineCap = "round";
ctx.strokeStyle = "#000000ff";

// Notify function
function notify(eventName: string) {
  event.dispatchEvent(new CustomEvent(eventName));
}

// Redraw canvas function
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const line of lines) {
    if (line.length > 1) {
      ctx.beginPath();
      const { x, y } = line[0];
      ctx.moveTo(x, y);
      for (const { x, y } of line) {
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}

event.addEventListener("drawing-changed", redraw);
event.addEventListener("cursor-changed", redraw);

// Set up event listeners for drawing
canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;

  thisLine = [];
  lines.push(thisLine);
  thisLine.push({ x: cursor.x, y: cursor.y });

  notify("cursor-changed");
});

canvas.addEventListener("mousemove", (e) => {
  if (cursor.active) {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    thisLine?.push({ x: cursor.x, y: cursor.y });
  }

  notify("drawing-changed");
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
  thisLine = null;

  notify("cursor-changed");
});

// Clear button functionality
const clearButton = document.getElementById("clear") as HTMLButtonElement;
clearButton.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
