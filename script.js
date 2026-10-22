
const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");

const container = document.getElementById("canvasContainer");
const colorPicker = document.getElementById("colorPicker");
const brushSize = document.getElementById("brushSize");
const opacity = document.getElementById("opacity");

const hexValue = document.getElementById("hexValue");
const sizeValue = document.getElementById("sizeValue");
const opacityValue = document.getElementById("opacityValue");
const emptyState = document.getElementById("emptyState");

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");

let currentTool = "brush";
let isDrawing = false;
let hasDrawing = false;
let lastX = 0;
let lastY = 0;

let strokes = [];
let redoStack = [];
let currentStroke = null;

let canvasWidth = 0;
let canvasHeight = 0;

function updateHistoryButtons() {
  undoBtn.disabled = strokes.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

function updateEmptyState() {
  emptyState.classList.toggle("hidden", hasDrawing);
}

function updateCanvasDimensions() {
  document.getElementById("canvasDimensions").textContent =
    `${Math.round(canvasWidth)} × ${Math.round(canvasHeight)} PX`;
}

function resizeCanvas() {
  const rect = container.getBoundingClientRect();

  if (!rect.width || !rect.height) return;

  // Preserve the existing artwork when the canvas resizes.
  let previousCanvas = null;

  if (canvas.width && canvas.height) {
    previousCanvas = document.createElement("canvas");
    previousCanvas.width = canvas.width;
    previousCanvas.height = canvas.height;
    previousCanvas.getContext("2d").drawImage(canvas, 0, 0);
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvasWidth = rect.width;
  canvasHeight = rect.height;

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (previousCanvas) {
    ctx.drawImage(
      previousCanvas,
      0, 0, previousCanvas.width, previousCanvas.height,
      0, 0, canvasWidth, canvasHeight
    );
  }

  updateCanvasDimensions();
}

function getPoint(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function getStrokeSettings() {
  return {
    color: colorPicker.value,
    size: Number(brushSize.value),
    opacity: Number(opacity.value) / 100,
    tool: currentTool
  };
}

function applyStrokeStyle(stroke) {
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = stroke.opacity;

  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
  }
}

function startDrawing(event) {
  if (event.button !== undefined && event.button !== 0) return;

  event.preventDefault();

  isDrawing = true;
  canvas.setPointerCapture?.(event.pointerId);

  const point = getPoint(event);
  lastX = point.x;
  lastY = point.y;

  currentStroke = {
    ...getStrokeSettings(),
    points: [{ x: point.x, y: point.y }]
  };

  applyStrokeStyle(currentStroke);

  // Draw a dot when the user taps without dragging.
  ctx.beginPath();
  ctx.arc(point.x, point.y, currentStroke.size / 2, 0, Math.PI * 2);

  if (currentStroke.tool === "eraser") {
    ctx.fillStyle = "#000";
  }

  ctx.fill();

  hasDrawing = true;
  updateEmptyState();
}

function draw(event) {
  if (!isDrawing || !currentStroke) return;

  event.preventDefault();

  const point = getPoint(event);

  currentStroke.points.push({ x: point.x, y: point.y });

  applyStrokeStyle(currentStroke);

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();

  lastX = point.x;
  lastY = point.y;
}

function stopDrawing(event) {
  if (!isDrawing) return;

  isDrawing = false;

  if (currentStroke) {
    strokes.push(currentStroke);
    redoStack = [];
    currentStroke = null;
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  updateHistoryButtons();

  if (event?.pointerId !== undefined &&
      canvas.hasPointerCapture?.(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

function renderStrokes() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  for (const stroke of strokes) {
    if (!stroke.points.length) continue;

    applyStrokeStyle(stroke);

    const first = stroke.points[0];

    ctx.beginPath();
    ctx.arc(first.x, first.y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();

    if (stroke.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  hasDrawing = strokes.length > 0;
  updateEmptyState();
  updateHistoryButtons();
}

function undo() {
  if (strokes.length === 0) return;

  redoStack.push(strokes.pop());
  renderStrokes();
}

function redo() {
  if (redoStack.length === 0) return;

  strokes.push(redoStack.pop());
  renderStrokes();
}

function clearCanvas() {
  if (strokes.length === 0) return;

  const confirmed = window.confirm(
    "Clear your artwork? You can’t undo this action."
  );

  if (!confirmed) return;

  strokes = [];
  redoStack = [];
  currentStroke = null;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  hasDrawing = false;
  updateEmptyState();
  updateHistoryButtons();
}

function setColor(color) {
  colorPicker.value = color;
  hexValue.textContent = color.toUpperCase();

  document.querySelectorAll(".swatch").forEach((swatch) => {
    swatch.classList.toggle(
      "selected",
      swatch.dataset.color.toLowerCase() === color.toLowerCase()
    );
  });
}

function setBrushSize(size) {
  brushSize.value = size;
  sizeValue.textContent = `${size} px`;

  document.querySelectorAll(".size-preset").forEach((preset) => {
    preset.classList.toggle(
      "selected",
      Number(preset.dataset.size) === Number(size)
    );
  });
}

function setTool(tool) {
  currentTool = tool;

  document.querySelectorAll(".tool-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });

  container.style.cursor = tool === "eraser" ? "cell" : "crosshair";
}

function exportCanvas() {
  // Export on a white background so transparent eraser areas
  // appear clean and the result opens consistently in image viewers.
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;

  const exportCtx = exportCanvas.getContext("2d");
  exportCtx.fillStyle = "#ffffff";
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportCtx.drawImage(canvas, 0, 0);

  const link = document.createElement("a");
  link.download = "atelier-artwork.png";
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
}

canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", draw);
canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);
canvas.addEventListener("lostpointercapture", () => {
  if (isDrawing) stopDrawing();
});

colorPicker.addEventListener("input", () => {
  setColor(colorPicker.value);
});

brushSize.addEventListener("input", () => {
  setBrushSize(brushSize.value);
});

opacity.addEventListener("input", () => {
  opacityValue.textContent = `${opacity.value}%`;
});

document.querySelectorAll(".swatch").forEach((swatch) => {
  swatch.addEventListener("click", () => {
    setColor(swatch.dataset.color);
  });
});

document.querySelectorAll(".size-preset").forEach((preset) => {
  preset.addEventListener("click", () => {
    setBrushSize(preset.dataset.size);
  });
});

document.querySelectorAll(".tool-btn").forEach((button) => {
  button.addEventListener("click", () => {
    setTool(button.dataset.tool);
  });
});

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

document.getElementById("clearBtn").addEventListener("click", clearCanvas);
document.getElementById("downloadBtn").addEventListener("click", exportCanvas);

document.addEventListener("keydown", (event) => {
  const modifier = event.ctrlKey || event.metaKey;

  if (modifier && event.key.toLowerCase() === "z") {
    event.preventDefault();

    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
  }

  if (modifier && event.key.toLowerCase() === "y") {
    event.preventDefault();
    redo();
  }
});

const resizeObserver = new ResizeObserver(() => {
  resizeCanvas();
  renderStrokes();
});

resizeObserver.observe(container);

resizeCanvas();
updateHistoryButtons();
setColor(colorPicker.value);
setBrushSize(brushSize.value);
