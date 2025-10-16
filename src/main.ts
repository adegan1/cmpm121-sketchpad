"use strict";

// Import assets
import "./style.css";

// Set up the HTML structure
document.body.innerHTML = `
  <h1 class="title">Sketchpad</h1>

  <canvas class="canvas" id="sketchpad" width="256" height="256"></canvas>

  <div class="button-container">
    <button class="button orange-button" id="undo">Undo</button>
    <button class="button orange-button" id="redo">Redo</button>
    <button class="button gray-button" id="clear">Clear</button>
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
const redoLines: Point[][] = [];

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
  redoLines.splice(0, redoLines.length); // Clear redo stack
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

// Undo button functionality
const undoButton = document.getElementById("undo") as HTMLButtonElement;
undoButton.addEventListener("click", () => {
  if (lines.length > 0) {
    redoLines.push(lines.pop()!);
    notify("drawing-changed");
  }
});

// Redo button functionality
const redoButton = document.getElementById("redo") as HTMLButtonElement;
redoButton.addEventListener("click", () => {
  if (redoLines.length > 0) {
    lines.push(redoLines.pop()!);
    notify("drawing-changed");
  }
});

// Clear button functionality
const clearButton = document.getElementById("clear") as HTMLButtonElement;
clearButton.addEventListener("click", () => {
  lines.splice(0, lines.length);
  notify("drawing-changed");
});
