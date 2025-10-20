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
    <br>
    <button class="button thickness-button" id="thin">Thin</button>
    <button class="button thickness-button" id="thick">Thick</button>
  </div>
`;

// Create a canvas element and add it to the body
const canvas = document.getElementById("sketchpad") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const cursor = { active: false, x: 0, y: 0 };

const event = new EventTarget();

// Set up default canvas context
ctx.lineWidth = 2;
ctx.lineCap = "round";
ctx.strokeStyle = "#000000ff";

// Create basic renderable interface
interface Renderable {
  display(ctx: CanvasRenderingContext2D): void;
}

// Setup different renderable objects
class Line implements Renderable {
  constructor(
    public points: { x: number; y: number }[],
    public color: string,
    public width: number,
  ) {}

  display(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.width;

    ctx.beginPath();
    const { x, y } = this.points[0];
    ctx.moveTo(x, y);

    for (const { x, y } of this.points) {
      ctx.lineTo(x, y);
    }

    ctx.stroke();
  }

  drag(point: { x: number; y: number }) {
    this.points.push(point);
  }
}

// Store drawn lines
const lines: Renderable[] = [];
const redoLines: Renderable[] = [];

let thisLine: Line | null = null;

// Notify function
function notify(eventName: string) {
  event.dispatchEvent(new CustomEvent(eventName));
}

// Redraw canvas function
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  lines.forEach((line) => line.display(ctx));
}

event.addEventListener("drawing-changed", redraw);
event.addEventListener("cursor-changed", redraw);

// Set up event listeners for drawing
canvas.addEventListener("mousedown", (e) => {
  console.log("Mouse down at:", e.offsetX, e.offsetY);
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;

  thisLine = new Line([], "#000000ff", 2);
  thisLine.drag({ x: cursor.x, y: cursor.y });
  lines.push(thisLine);
  redoLines.splice(0, redoLines.length); // Clear redo stack

  notify("cursor-changed");
});

canvas.addEventListener("mousemove", (e) => {
  if (cursor.active && thisLine) {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    thisLine.drag({ x: cursor.x, y: cursor.y });
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
