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

// Set up event listeners for drawing
canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;
});

canvas.addEventListener("mousemove", (e) => {
  if (cursor.active) {
    ctx.beginPath();
    ctx.moveTo(cursor.x, cursor.y);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
  }
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
});

// Clear button functionality
const clearButton = document.getElementById("clear") as HTMLButtonElement;
clearButton.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
