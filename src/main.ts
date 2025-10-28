"use strict";

// Import assets
import "./style.css";

// Set up the HTML structure
document.body.innerHTML = `
  <h1 class="title">Sketchpad</h1>

  <canvas class="canvas" id="sketchpad" width="256" height="256"></canvas>

  <!-- Edit Toolbar -->
  <div class="toolbar" id="edit-tools">
    <button class="button orange-button" id="undo">Undo ↩️</button>
    <button class="button orange-button" id="redo">Redo ↪️</button>
    <button class="button gray-button" id="clear">Clear</button>
  </div>

  <!-- Brush Toolbar -->
  <div class="toolbar" id="brush-tools">
    <div class="toolbar sub-toolbar">
      <input type="range" id="brush-size" min="1" max="20" value="3" class="slider">
      <span id="brush-preview" class="preview-circle" style="width: 3px; height: 3px;"></span>
    </div>
    <button class="button draw-button" id="draw" data-width="5">Draw ✏️</button>
    <input type="color" class="colorPicker" id="colorPicker" value="#000000ff">
  </div>

  <!-- Sticker Toolbar -->
  <div class="toolbar" id="sticker-tools">
    <div class="toolbar sub-toolbar">
      <input type="range" id="sticker-size" min="10" max="60" value="20" class="slider">
      <span id="sticker-preview" class="preview-circle" style="width: 20px; height: 20px;"></span>
    </div>
    <!-- Stickers will be inserted here dynamically -->
    <div id="sticker-container"></div>
  </div>

  <!-- Export Button -->
  <div class="toolbar" id="export-tools">
    <button class="button export-button">Export (TP 🪟) 💾</button>
    <button class="button export-button" data-bg="white">Export (BG 🖼️) 💾</button>
  </div>
`;

// Create a canvas element and add it to the body
const canvas = document.getElementById("sketchpad") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const cursor = { active: false, x: 0, y: 0 };
let isHovering = false;

// Create enum for current tool
enum ToolMode {
  Drawing,
  Sticker,
}
let currentMode: ToolMode = ToolMode.Drawing;

let currentSticker: string | null = null;
let stickerSize = 20;

const event = new EventTarget();

let currentButton: HTMLButtonElement | null = null;

// Set up default canvas context
ctx.lineCap = "round";
let currentColor = "#000000ff";
let currentWidth = 3;

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
    if (this.points.length === 0) return;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.width;
    ctx.lineCap = "round";

    // Draw a dot if there is only one point
    if (this.points.length === 1) {
      const { x, y } = this.points[0];
      ctx.beginPath();
      ctx.arc(x, y, this.width / 2, 0, Math.PI * 2); // Draw a circle
      ctx.fillStyle = this.color;
      ctx.fill();
      return;
    }

    // Otherwise, draw line as usual
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
    public fontSize: number,
  ) {}

  display(ctx: CanvasRenderingContext2D): void {
    ctx.font = `${this.fontSize}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y);
  }
}

const stickers: string[] = ["😭", "❤️", "✨"];

// Function to create buttons for stickers
function createStickerButtons() {
  const container = document.getElementById(
    "sticker-tools",
  ) as HTMLDivElement;

  stickers.forEach((sticker) => {
    const btn = document.createElement("button");
    btn.className = "button sticker-button";
    btn.textContent = sticker;
    btn.title = `Sticker: ${sticker}`;
    btn.dataset.sticker = sticker;

    btn.addEventListener("click", () => {
      selectButton(btn);
      activateStickerTool(sticker);
    });

    container.appendChild(btn);
  });

  // Custom sticker functionality
  // Add a "+" button at the end
  const addBtn = document.createElement("button");
  addBtn.className = "button sticker-button";
  addBtn.textContent = "+";
  addBtn.title = "Create custom sticker";

  addBtn.addEventListener("click", () => {
    const input = prompt("Enter a custom sticker:", "🎯");
    if (!input || input.trim() === "") return;

    const char = input.trim();

    // Add to data
    stickers.push(char);

    // Regenerate buttons to reflect new data 💥
    document.querySelectorAll(".sticker-button").forEach((btn) => {
      btn.remove();
    });
    createStickerButtons(); // rebuild all
  });

  container.appendChild(addBtn);
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
    if (currentMode == ToolMode.Drawing) { // Drawing mode preview
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, currentWidth / 2, 0, Math.PI * 2); // Circle centered on cursor
      ctx.fillStyle = currentColor;
      ctx.fill();
      ctx.closePath();
    } else if (currentMode == ToolMode.Sticker && currentSticker) { // Sticker mode preview
      ctx.font = `${stickerSize}px serif`;
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

  if (currentMode == ToolMode.Drawing) { // Drawing mode
    thisLine = new Line([], currentColor, currentWidth);
    thisLine.drag({ x: cursor.x, y: cursor.y });
    lines.push(thisLine);
    redoLines.splice(0, redoLines.length); // Clear redo stack
  } else if (currentMode == ToolMode.Sticker && currentSticker) { // Sticker mode
    const sticker = new Sticker(
      cursor.x,
      cursor.y,
      currentSticker,
      stickerSize,
    );
    lines.push(sticker);
    redoLines.splice(0, redoLines.length); // Clear redo stack
  }

  notify("cursor-changed");
});

canvas.addEventListener("mousemove", (e) => {
  if (currentMode == ToolMode.Drawing) {
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

// Draw button functionality
const drawButton = document.getElementById("draw") as HTMLButtonElement;
drawButton.addEventListener("click", () => {
  currentMode = ToolMode.Drawing; // Switch to drawing mode
  selectButton(drawButton);
});
selectButton(drawButton); // Select draw button by default

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
  currentMode = ToolMode.Sticker;
  currentSticker = emoji;
}

// Color picker functionality
const colorPicker = document.getElementById("colorPicker") as HTMLInputElement;
colorPicker.addEventListener("input", () => {
  currentColor = colorPicker.value;
});

// Brush & Sticker size slider functionality
const brushSlider = document.getElementById("brush-size") as HTMLInputElement;
const brushPreview = document.getElementById("brush-preview") as HTMLDivElement;

brushSlider.addEventListener("input", () => {
  const size = parseInt(brushSlider.value);
  currentWidth = size;
  brushPreview.style.width = `${size}px`;
  brushPreview.style.height = `${size}px`;
  brushPreview.style.color = currentColor;
  notify("cursor-changed"); // trigger redraw for hover preview
});

const stickerSlider = document.getElementById(
  "sticker-size",
) as HTMLInputElement;
const stickerPreview = document.getElementById(
  "sticker-preview",
) as HTMLDivElement;

stickerSlider.addEventListener("input", () => {
  const size = parseInt(stickerSlider.value);
  stickerSize = size;
  stickerPreview.style.width = `${size}px`;
  stickerPreview.style.height = `${size}px`;
  notify("tool-moved"); // update sticker hover preview
});

// Add Export Button functionality
document.querySelectorAll(".export-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn as HTMLButtonElement;

    // Read the background setting from data attribute
    const bg = target.dataset.bg || null; // "white" or null

    // Pass it to your unified export function
    exportDrawing(bg);
  });
});

// Export HD drawing
function exportDrawing(bgColor: string | null = null) {
  // Create offscreen canvas at 1024x1024 (4x scale)
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const ctx = exportCanvas.getContext("2d")!;

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  }

  // Scale context so everything draws 4x larger
  ctx.scale(4, 4);

  // Re-run all 'renderable' items from lines array (skip previews)
  lines.forEach((item) => {
    item.display(ctx);
  });

  // Convert to PNG and trigger download
  const link = document.createElement("a");
  link.download = "sketchpad.png";
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
}

// Initial function calls
redraw();
createStickerButtons();
