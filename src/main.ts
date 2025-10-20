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
    <button class="button thickness-button" id="thin" data-width="2">Thin</button>
    <button class="button thickness-button" id="thick" data-width="5">Thick</button>
    <br>
    <input type="color" class="colorPicker" id="colorPicker" value="#000000ff">
    <br>
    <button class="button sticker-button" id="sticker" data-sticker="😭">😭</button>
    <button class="button sticker-button" id="sticker" data-sticker="❤️">❤️</button>
    <button class="button sticker-button" id="sticker" data-sticker="✨">✨</button>
  </div>
`;

// Create a canvas element and add it to the body
const canvas = document.getElementById("sketchpad") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const cursor = { active: false, x: 0, y: 0 };
let isHovering = false;

let currentSticker: string | null = null;
let stickerMode = false;

const event = new EventTarget();

let currentButton: HTMLButtonElement | null = null;

// Set up default canvas context
ctx.lineCap = "round";
let currentColor = "#000000ff";
let currentWidth = 2;

// Create basic renderable interface
interface Renderable {
  display(ctx: CanvasRenderingContext2D): void;
}

// Setup different renderable objects
class Line implements Renderable {
  constructor(
    public points: { x: number; y: number }[],
    public color: string | CanvasGradient | CanvasPattern,
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

// Create sticker class
class Sticker implements Renderable {
  constructor(
    public x: number,
    public y: number,
    public emoji: string,
    public size: number = 32,
  ) {}

  display(ctx: CanvasRenderingContext2D): void {
    ctx.font = `${this.size}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y);
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

  // Draw preview if hovering
  if (isHovering) {
    if (!stickerMode) { // Drawing mode preview
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, currentWidth / 2, 0, Math.PI * 2); // Circle centered on cursor
      ctx.fillStyle = currentColor;
      ctx.fill();
      ctx.closePath();
    } else if (stickerMode && currentSticker) { // Sticker mode preview
      ctx.font = `32px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(currentSticker, cursor.x, cursor.y);
    }
  }
}

event.addEventListener("drawing-changed", redraw);
event.addEventListener("cursor-changed", redraw);
event.addEventListener("tool-moved", redraw);

// Set up event listeners for drawing
canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;

  if (!stickerMode) { // Drawing mode
    thisLine = new Line([], currentColor, currentWidth);
    thisLine.drag({ x: cursor.x, y: cursor.y });
    lines.push(thisLine);
    redoLines.splice(0, redoLines.length); // Clear redo stack
  } else if (stickerMode && currentSticker) { // Sticker mode
    const sticker = new Sticker(cursor.x, cursor.y, currentSticker);
    lines.push(sticker);
    redoLines.splice(0, redoLines.length); // Clear redo stack
  }

  notify("cursor-changed");
});

canvas.addEventListener("mousemove", (e) => {
  if (!stickerMode) {
    if (cursor.active && thisLine) {
      cursor.x = e.offsetX;
      cursor.y = e.offsetY;
      thisLine.drag({ x: cursor.x, y: cursor.y });
    }
  }

  // Update cursor position on mouse move
  if (isHovering) {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    notify("tool-moved");
  }

  notify("drawing-changed");
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
  thisLine = null;

  notify("cursor-changed");
});

// Mouse enter and leave events to manage hovering state
canvas.addEventListener("mouseenter", () => {
  isHovering = true;
  canvas.style.cursor = "none";
  notify("tool-moved");
});

canvas.addEventListener("mouseleave", () => {
  isHovering = false;
  canvas.style.cursor = "default";
  notify("drawing-changed");
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

// Button selection
function selectButton(button: HTMLButtonElement) {
  // Deselect previous button and select the new one
  if (currentButton) {
    currentButton.classList.remove("selected");
  }
  button.classList.add("selected");

  currentButton = button;
}

// Thickness buttons functionality
function setupThicknessButton(button: HTMLButtonElement) {
  button.addEventListener("click", () => {
    const width = parseInt(button.getAttribute("data-width") || "2", 10);
    currentWidth = width;

    stickerMode = false; // Switch to drawing mode
    selectButton(button);
  });
}

// Get all thickness buttons and set them up
document.querySelectorAll(".thickness-button").forEach((btn) => {
  setupThicknessButton(btn as HTMLButtonElement);
});

// Sticker buttons functionality
document.querySelectorAll(".sticker-button").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const sticker = (e.target as HTMLElement).getAttribute("data-sticker");
    if (sticker) {
      selectButton(btn as HTMLButtonElement);
      activateStickerTool(sticker);
    }
  });
});

function activateStickerTool(emoji: string) {
  stickerMode = true;
  currentSticker = emoji;
}

// Select default thickness button
const defaultThicknessButton = document.getElementById(
  "thin",
) as HTMLButtonElement;
selectButton(defaultThicknessButton);

// Color picker functionality
const colorPicker = document.getElementById("colorPicker") as HTMLInputElement;
colorPicker.addEventListener("input", () => {
  currentColor = colorPicker.value;
});

// Initial draw
redraw();
