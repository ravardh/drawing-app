// Selecting DOM elements
const canvas = document.querySelector("canvas");
const toolOptions = document.querySelectorAll(".tools-board .tool");
const fillColorCheckbox = document.querySelector("#fill-color");
const brushSizeSlider = document.querySelector("#brush-size-slider");
const colorButtons = document.querySelectorAll(".colors .option");
const colorPicker = document.querySelector("#color-picker");
const undoRedoButtons = document.querySelectorAll(".actions-tool li");
const clearCanvasBtn = document.querySelector(".clear-canvas");
const saveImgBtn = document.querySelector(".save-img");
const ctx = canvas.getContext("2d");

// Drawing state
let drawingHistory = [];
let redoHistory = [];
let currentStep = 0;
let isDrawing = false;
let brushSize = 5;
let selectedColor = "#000";
let selectedTool = "brush";
let prevMousePoint = { x: 0, y: 0 };
let canvasSnapshot = null;

// Initialize canvas
const initCanvas = () => {
  document.documentElement.style.setProperty('--doc-height', `${window.innerHeight}px`);
  const dpr = window.devicePixelRatio || 1;
  const canvasRect = canvas.getBoundingClientRect();
  canvas.width = canvasRect.width * dpr;
  canvas.height = canvasRect.height * dpr;
  ctx.scale(dpr, dpr);
}

// Reset Canvas
const resetCanvas = () => {
  initCanvas();
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawingHistory.push(localStorage.getItem("savedDrawing") || canvas.toDataURL());
}

const getImageSize = (image) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const canvasRect = canvas.getBoundingClientRect();
  const aspectRatio = image.width / image.height;
  const newWidth = canvasRect.width;
  const newHeight = newWidth / aspectRatio;
  return { newWidth, newHeight };
}

// Load drawing from local storage and sipaly on the canvas
const loadLocalstorageDrawing = () => {
  const savedDrawing = localStorage.getItem("savedDrawing");
  if (!savedDrawing) return;

  const image = new Image();
  image.src = savedDrawing;
  image.onload = () => {
    const { newWidth, newHeight } = getImageSize(image);
    ctx.drawImage(image, 0, 0, newWidth, newHeight);
  }
}
// Save drawing to localStorage
const saveDrawingToLocalstorage = () => {
  const canvasDrawing = canvas.toDataURL();
  localStorage.setItem("savedDrawing", canvasDrawing);
}

// Save drawing state on the variables
const saveDrawingState = () => {
  if (currentStep < drawingHistory.length - 1) {
    drawingHistory = drawingHistory.slice(0, currentStep + 1);
  }
  currentStep++;
  drawingHistory.push(canvas.toDataURL());
  redoHistory = [];
  saveDrawingToLocalstorage();
}

// Handle undo and redo functionality
const handleUndoRedo = (selectedBtn) => {
  if (selectedBtn.id === "undo" && currentStep > 0) {
    currentStep--;
    redoHistory.push(drawingHistory[currentStep + 1]);
  } else if (selectedBtn.id === "redo" && redoHistory.length > 0) {
    currentStep++;
    drawingHistory.push(redoHistory.pop());
  } else {
    return;
  }

  const image = new Image();
  image.src = drawingHistory[currentStep];
  image.onload = () => {
    const { newWidth, newHeight } = getImageSize(image);
    ctx.drawImage(image, 0, 0, newWidth, newHeight);
    saveDrawingToLocalstorage();
  }
}

// Function to get current mouse/touch coordinates
const currMousePoint = (e) => {
  let x = ("ontouchstart" in window ? e.touches?.[0]?.pageX : e.pageX) - canvas.offsetLeft;
  let y = ("ontouchstart" in window ? e.touches?.[0]?.pageY : e.pageY) - canvas.offsetTop;
  return { x, y };
}

// Functions to draw line shape
const drawLine = (position) => {
  ctx.beginPath();
  ctx.moveTo(prevMousePoint.x, prevMousePoint.y);
  ctx.lineTo(position.x, position.y);
  ctx.stroke();
}

// Functions to draw rectangle shape
const drawRectangle = (position) => {
  ctx.beginPath();
  const width = position.x - prevMousePoint.x;
  const height = position.y - prevMousePoint.y;

  ctx.rect(prevMousePoint.x, prevMousePoint.y, width, height);

  fillColorCheckbox.checked ? ctx.fill() : ctx.stroke();
  ctx.closePath();
}

// Functions to draw circle shape
const drawCircle = (position) => {
  ctx.beginPath();
  let radius = Math.sqrt(Math.pow((prevMousePoint.x - position.x), 2) + Math.pow((prevMousePoint.y - position.y), 2));
  ctx.arc(prevMousePoint.x, prevMousePoint.y, radius, 0, 2 * Math.PI);
  fillColorCheckbox.checked ? ctx.fill() : ctx.stroke();
}

// Functions to draw triangle shape
const drawTriangle = (position) => {
  ctx.beginPath();
  ctx.moveTo(prevMousePoint.x, prevMousePoint.y);
  ctx.lineTo(position.x, position.y);
  ctx.lineTo(prevMousePoint.x * 2 - position.x, position.y);
  ctx.closePath();
  fillColorCheckbox.checked ? ctx.fill() : ctx.stroke();
}

// Function to handle the start of drawing
const drawStart = (e) => {
  e.preventDefault();
  isDrawing = true;
  ctx.beginPath();
  ctx.lineCap = "round";
  prevMousePoint = currMousePoint(e);
  ctx.lineWidth = brushSize;
  ctx.strokeStyle = selectedColor;
  ctx.fillStyle = selectedColor;
  canvasSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// Function to handle drawing
const drawing = (e) => {
  if (!isDrawing) return;
  e.preventDefault();
  let position = currMousePoint(e);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.putImageData(canvasSnapshot, 0, 0);

  if (selectedTool === "brush" || selectedTool === "eraser") {
    ctx.strokeStyle = selectedTool === "eraser" ? "#fff" : selectedColor;
    ctx.lineTo(position.x, position.y);
    ctx.stroke();
  } else if (selectedTool === "line") {
    drawLine(position);
  } else if (selectedTool === "rect") {
    drawRectangle(position);
  } else if (selectedTool === "circle") {
    drawCircle(position);
  } else {
    drawTriangle(position);
  }
  ctx.stroke();
}

// Function to handle the end of drawing and saving drawing to local storage
const drawStop = () => {
  if (!isDrawing) return;
  isDrawing = false;
  saveDrawingState();
}

// Event listeners for tool options (brush, eraser, etc.)
toolOptions.forEach(tool => {
  tool.addEventListener("click", () => {
    document.querySelector(".options .active").classList.remove("active");
    tool.classList.add("active");
    selectedTool = tool.id;
  });
});

// Event listener for brush size slider
brushSizeSlider.addEventListener("change", (e) => {
  e.preventDefault();
  brushSize = brushSizeSlider.value;
});

// Event listeners for color buttons
colorButtons.forEach(button => {
  button.addEventListener("click", () => {
    document.querySelector(".colors .selected").classList.remove("selected");
    button.classList.add("selected");
    selectedColor = window.getComputedStyle(button).getPropertyValue("background-color");
  });
});

// Event listener for color picker
colorPicker.addEventListener("input", (e) => {
  colorPicker.parentElement.classList.add("active");
  colorPicker.parentElement.style.backgroundColor = e.target.value;
  colorPicker.parentElement.click();
});

undoRedoButtons.forEach(button => {
  button.addEventListener("click", () => handleUndoRedo(button));
});

// Event listener for saving image
saveImgBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `${new Date().getTime()}.jpg`;
  link.href = canvas.toDataURL();
  link.click();
});

const resetDrawingState = () => {
  localStorage.removeItem("savedDrawing");
  drawingHistory = [];
  redoHistory = [];
  currentStep = 0;
  resetCanvas();
}

// Different event listeners for drawing app

clearCanvasBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear the canvas?")) resetDrawingState();
});

window.addEventListener("load", () => {
  resetCanvas();
  loadLocalstorageDrawing();
});

window.addEventListener("orientationchange", resetDrawingState);
window.addEventListener("resize", resetCanvas);

canvas.addEventListener("mousedown", drawStart);
canvas.addEventListener("touchstart", drawStart);

canvas.addEventListener("mousemove", drawing);
canvas.addEventListener("touchmove", drawing);

canvas.addEventListener("mouseup", drawStop);
canvas.addEventListener("mouseleave", drawStop);
canvas.addEventListener("touchend", drawStop);