const stage = document.querySelector("#panoramaWindow");
const canvas = document.querySelector("#panoramaCanvas");
const resetButton = document.querySelector("#resetPanorama");
const context = canvas.getContext("2d");

const panoImage = new Image();
panoImage.src = "./assets/quest-gallery/story_panorama_v75.jpg";

let sourceCanvas;
let sourceContext;
let sourcePixels;
let sourceWidth = 0;
let sourceHeight = 0;

let yaw = 0.06;
let pitch = -0.03;
let dragging = false;
let lastX = 0;
let lastY = 0;
let autoPan = true;
let lastAutoRender = 0;
let needsRender = true;

const fov = Math.PI / 2.25;
const maxPitch = Math.PI / 4.8;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wrap01(value) {
  return ((value % 1) + 1) % 1;
}

function prepareSource() {
  sourceWidth = panoImage.naturalWidth;
  sourceHeight = panoImage.naturalHeight;
  sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = sourceWidth;
  sourceCanvas.height = sourceHeight;
  sourceContext = sourceCanvas.getContext("2d");
  sourceContext.drawImage(panoImage, 0, 0);
  sourcePixels = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight).data;
}

function resizeCanvas() {
  const rect = stage.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 1.4);
  canvas.width = Math.max(320, Math.round(rect.width * ratio));
  canvas.height = Math.max(220, Math.round(rect.height * ratio));
  needsRender = true;
}

function samplePanorama(u, v, output, index) {
  const sx = Math.floor(wrap01(u) * sourceWidth);
  const sy = clamp(Math.floor(v * sourceHeight), 0, sourceHeight - 1);
  const src = (sy * sourceWidth + sx) * 4;
  output[index] = sourcePixels[src];
  output[index + 1] = sourcePixels[src + 1];
  output[index + 2] = sourcePixels[src + 2];
  output[index + 3] = 255;
}

function renderPanorama() {
  if (!sourcePixels) return;

  const width = canvas.width;
  const height = canvas.height;
  const imageData = context.createImageData(width, height);
  const data = imageData.data;
  const aspect = width / height;
  const tanHalfFov = Math.tan(fov / 2);
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  for (let y = 0; y < height; y += 1) {
    const ny = (1 - (y + 0.5) / height * 2) * tanHalfFov;
    for (let x = 0; x < width; x += 1) {
      const nx = (((x + 0.5) / width) * 2 - 1) * tanHalfFov * aspect;

      let dx = nx;
      let dy = ny;
      let dz = 1;
      const len = Math.hypot(dx, dy, dz);
      dx /= len;
      dy /= len;
      dz /= len;

      const py = dy * cosPitch - dz * sinPitch;
      const pz = dy * sinPitch + dz * cosPitch;
      const px = dx;

      const rx = px * cosYaw + pz * sinYaw;
      const rz = -px * sinYaw + pz * cosYaw;

      const longitude = Math.atan2(rx, rz);
      const latitude = Math.asin(clamp(py, -1, 1));
      const u = 0.5 + longitude / (Math.PI * 2);
      const v = 0.5 - latitude / Math.PI;

      samplePanorama(u, v, data, (y * width + x) * 4);
    }
  }

  context.putImageData(imageData, 0, 0);
  needsRender = false;
}

function resetView() {
  yaw = 0.06;
  pitch = -0.03;
  autoPan = true;
  needsRender = true;
}

stage.addEventListener("pointerdown", (event) => {
  dragging = true;
  autoPan = false;
  lastX = event.clientX;
  lastY = event.clientY;
  stage.setPointerCapture(event.pointerId);
});

stage.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  const dx = event.clientX - lastX;
  const dy = event.clientY - lastY;
  lastX = event.clientX;
  lastY = event.clientY;
  yaw -= dx * 0.0085;
  pitch = clamp(pitch + dy * 0.0065, -maxPitch, maxPitch);
  needsRender = true;
});

stage.addEventListener("pointerup", () => {
  dragging = false;
});

stage.addEventListener("pointercancel", () => {
  dragging = false;
});

resetButton.addEventListener("click", resetView);
window.addEventListener("resize", resizeCanvas);

function animate(time) {
  if (autoPan && !document.hidden && time - lastAutoRender > 80) {
    yaw += 0.006;
    needsRender = true;
    lastAutoRender = time;
  }

  if (needsRender) {
    renderPanorama();
  }

  requestAnimationFrame(animate);
}

panoImage.addEventListener("load", () => {
  prepareSource();
  resizeCanvas();
  requestAnimationFrame(animate);
});
