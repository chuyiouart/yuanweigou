import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const manifestUrl = "./assets/virtual-gallery-v106/gallery-manifest.json";
const mount = document.getElementById("v106GalleryCanvas");
const fullscreenButton = document.getElementById("v106FullscreenButton");
const loading = document.getElementById("v106Loading");
const hallLabel = document.getElementById("v106Hall");
const info = {
  code: document.getElementById("v106Code"),
  title: document.getElementById("v106Title"),
  desc: document.getElementById("v106Desc"),
  meta: document.getElementById("v106Meta"),
  use: document.getElementById("v106Use"),
  link: document.getElementById("v106CaseLink"),
};

const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const keys = new Set();
const mobileStick = { x: 0, y: 0 };
const clickable = [];
const modelEntries = new Map();

const ENABLE_MODEL_SHADOWS = false;
const MODEL_SHADOW_PRESET = {
  mapSize: 1024,
  cameraLeft: -9,
  cameraRight: 9,
  cameraTop: 8,
  cameraBottom: -28,
  cameraNear: 1,
  cameraFar: 24,
  bias: -0.00025,
  normalBias: 0.025,
};

let renderer;
let scene;
let camera;
let yaw = 0;
let pitch = -0.03;
let dragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
let pointerDownX = 0;
let pointerDownY = 0;
let dragDistance = 0;
let manifest;
let assetRoot;
let selectedFrame = null;
let lastTime = performance.now();
let lastModelLoadCheck = 0;
let lastLoadingText = "";
let joystickPointerId = null;

init().catch((error) => {
  console.error(error);
  loading.textContent = "展厅载入失败，请刷新页面重试";
});

async function init() {
  manifest = await fetch(manifestUrl).then((response) => response.json());
  assetRoot = manifest.assetRoot;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xded9ce);
  scene.fog = new THREE.Fog(0xded9ce, 16, 36);

  const width = mount.clientWidth || 900;
  const height = mount.clientHeight || 720;

  camera = new THREE.PerspectiveCamera(62, width / height, 0.08, 80);
  camera.position.set(0, 1.58, 8.4);
  updateCameraRotation();

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.45));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = ENABLE_MODEL_SHADOWS;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.style.userSelect = "none";
  renderer.domElement.style.webkitUserSelect = "none";
  renderer.domElement.style.webkitTouchCallout = "none";
  mount.appendChild(renderer.domElement);

  addLights();
  addGalleryShell();
  addArtworks();
  setupInput();
  updateInfoIntro();

  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(render);
}

function addLights() {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb5ac9f, 2.35));

  const softKey = new THREE.DirectionalLight(0xffffff, 1.2);
  softKey.position.set(1.2, 8.2, 5.8);
  softKey.castShadow = ENABLE_MODEL_SHADOWS;
  softKey.shadow.mapSize.set(MODEL_SHADOW_PRESET.mapSize, MODEL_SHADOW_PRESET.mapSize);
  softKey.shadow.camera.left = MODEL_SHADOW_PRESET.cameraLeft;
  softKey.shadow.camera.right = MODEL_SHADOW_PRESET.cameraRight;
  softKey.shadow.camera.top = MODEL_SHADOW_PRESET.cameraTop;
  softKey.shadow.camera.bottom = MODEL_SHADOW_PRESET.cameraBottom;
  softKey.shadow.camera.near = MODEL_SHADOW_PRESET.cameraNear;
  softKey.shadow.camera.far = MODEL_SHADOW_PRESET.cameraFar;
  softKey.shadow.bias = MODEL_SHADOW_PRESET.bias;
  softKey.shadow.normalBias = MODEL_SHADOW_PRESET.normalBias;
  scene.add(softKey);
}

function addGalleryShell() {
  const floorTexture = makeFloorTexture();
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(7, 15);
  floorTexture.colorSpace = THREE.SRGBColorSpace;
  floorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const wallTexture = makeWallTexture();
  wallTexture.wrapS = THREE.RepeatWrapping;
  wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(4, 2);
  wallTexture.colorSpace = THREE.SRGBColorSpace;

  const ceilingTexture = makeCeilingTexture();
  ceilingTexture.wrapS = THREE.RepeatWrapping;
  ceilingTexture.wrapT = THREE.RepeatWrapping;
  ceilingTexture.repeat.set(4, 9);
  ceilingTexture.colorSpace = THREE.SRGBColorSpace;
  ceilingTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.82 });
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.9 });
  const ceilingMat = new THREE.MeshBasicMaterial({ map: ceilingTexture, color: 0xffffff });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 36), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -9);
  floor.receiveShadow = ENABLE_MODEL_SHADOWS;
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(13.2, 34.8), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 4.75, -9);
  scene.add(ceiling);

  addWall(new THREE.Vector3(-6.9, 2.36, -9), Math.PI / 2, 36, 4.72, wallMat);
  addWall(new THREE.Vector3(6.9, 2.36, -9), -Math.PI / 2, 36, 4.72, wallMat);
  addWall(new THREE.Vector3(0, 2.36, 9), Math.PI, 13.8, 4.72, wallMat);
  addWall(new THREE.Vector3(0, 2.36, -27), 0, 13.8, 4.72, wallMat);

  const dividerMat = new THREE.MeshStandardMaterial({ color: 0xe6e0d5, roughness: 0.9 });
  addDividerWall(-4.8, -9, dividerMat);
  addDividerWall(4.8, -9, dividerMat);

  addBench(0, 1.6);
  addBench(0, -16.4);
}

function addWall(position, rotationY, width, height, material) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  wall.position.copy(position);
  wall.rotation.y = rotationY;
  scene.add(wall);
}

function addDividerWall(x, z, material) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.7, 0.14), material);
  wall.position.set(x, 2.35, z);
  scene.add(wall);
}

function addBench(x, z) {
  const wood = new THREE.MeshStandardMaterial({ color: 0xb87734, roughness: 0.64 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.16, 0.44), wood);
  seat.position.set(x, 0.56, z);
  scene.add(seat);
  [-0.82, 0.82].forEach((offset) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.36), wood);
    leg.position.set(x + offset, 0.28, z);
    scene.add(leg);
  });
}

function addArtworks() {
  manifest.artworks.forEach((artwork) => {
    const side = artwork.wall === "left" ? -1 : 1;
    const wallX = side * 6.82;
    const modelX = side * 5.25;
    const rotY = side < 0 ? Math.PI / 2 : -Math.PI / 2;

    const artGroup = createArtwork(artwork);
    artGroup.position.set(wallX, 2.05, artwork.z);
    artGroup.rotation.y = rotY;
    scene.add(artGroup);

    addPedestal(modelX, artwork.z);
    modelEntries.set(artwork.id, {
      artwork,
      x: modelX,
      z: artwork.z,
      rotationY: rotY,
      loaded: false,
      loading: false,
    });
  });
}

function createArtwork(artwork) {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x241b14, roughness: 0.62 });
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xfffbef, roughness: 0.86 });

  const isWide = artwork.id === "TS01-030" || artwork.id === "TS01-003";
  const frameW = isWide ? 1.36 : 0.92;
  const frameH = isWide ? 1.02 : 1.26;

  const frame = new THREE.Mesh(new THREE.BoxGeometry(frameW, frameH, 0.075), frameMat);
  group.add(frame);

  const paper = new THREE.Mesh(new THREE.PlaneGeometry(frameW - 0.1, frameH - 0.1), paperMat);
  paper.position.z = 0.045;
  group.add(paper);

  const maxArtW = frameW - 0.22;
  const maxArtH = frameH - 0.22;
  const texture = textureLoader.load(`${assetRoot}/wall/${artwork.wallImage}`, (loadedTexture) => {
    loadedTexture.colorSpace = THREE.SRGBColorSpace;
    loadedTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const imageAspect = loadedTexture.image.width / loadedTexture.image.height;
    const slotAspect = maxArtW / maxArtH;
    const displayW = imageAspect >= slotAspect ? maxArtW : maxArtH * imageAspect;
    const displayH = imageAspect >= slotAspect ? maxArtW / imageAspect : maxArtH;
    art.geometry.dispose();
    art.geometry = new THREE.PlaneGeometry(displayW, displayH);
    art.material.needsUpdate = true;
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const art = new THREE.Mesh(
    new THREE.PlaneGeometry(maxArtW, maxArtH),
    new THREE.MeshBasicMaterial({ map: texture })
  );
  art.position.z = 0.055;
  art.userData.artwork = artwork;
  art.userData.frame = frame;
  group.add(art);
  clickable.push(art);

  return group;
}

function addPedestal(x, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.76 });
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.74, 0.72), mat);
  pedestal.position.set(x, 0.37, z);
  pedestal.receiveShadow = ENABLE_MODEL_SHADOWS;
  scene.add(pedestal);
}

function loadNearModels() {
  let loaded = 0;
  let total = modelEntries.size;
  modelEntries.forEach((entry) => {
    if (entry.loaded || entry.loading) {
      if (entry.loaded) loaded += 1;
      return;
    }
    const distance = Math.hypot(camera.position.x - entry.x, camera.position.z - entry.z);
    if (distance > 10.5) return;
    entry.loading = true;
    gltfLoader.load(
      `${assetRoot}/models/${entry.artwork.model}`,
      (gltf) => {
        const model = gltf.scene;
        model.rotation.y = entry.rotationY;
        model.traverse((child) => {
          if (child.isMesh) {
            child.frustumCulled = true;
            child.castShadow = ENABLE_MODEL_SHADOWS;
            child.receiveShadow = ENABLE_MODEL_SHADOWS;
          }
        });
        alignModel(model, entry.x, entry.z);
        scene.add(model);
        entry.loaded = true;
        entry.loading = false;
        updateLoading();
      },
      undefined,
      () => {
        addFallbackModel(entry.x, entry.z);
        entry.loaded = true;
        entry.loading = false;
        updateLoading();
      }
    );
  });
  modelEntries.forEach((entry) => {
    if (entry.loaded) loaded += 1;
  });
  return { loaded, total };
}

function alignModel(model, x, z) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = 0.62 / maxDim;
  model.scale.setScalar(scale);
  model.position.set(x - center.x * scale, 0.78 - box.min.y * scale, z - center.z * scale);
}

function addFallbackModel(x, z) {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.28, 1),
    new THREE.MeshStandardMaterial({ color: 0xb77442, roughness: 0.48 })
  );
  mesh.castShadow = ENABLE_MODEL_SHADOWS;
  mesh.receiveShadow = ENABLE_MODEL_SHADOWS;
  mesh.position.set(x, 1.08, z);
  scene.add(mesh);
}

function setupInput() {
  renderer.domElement.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (event.pointerType !== "touch") {
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
        return;
      }
      const hit = getCenterHit();
      if (hit?.object?.userData?.artwork) {
        selectArtwork(hit.object.userData.artwork, hit.object.userData.frame);
      }
      return;
    }

    dragging = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    dragDistance = 0;
    renderer.domElement.setPointerCapture(event.pointerId);
  });

  renderer.domElement.addEventListener("pointermove", (event) => {
    event.preventDefault();
    if (event.pointerType !== "touch") {
      if (document.pointerLockElement !== renderer.domElement) return;
      return;
    }

    if (dragging) {
      const dx = event.clientX - lastPointerX;
      const dy = event.clientY - lastPointerY;
      dragDistance = Math.max(dragDistance, Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY));
      yaw -= dx * 0.0042;
      pitch = clamp(pitch - dy * 0.0032, -0.82, 0.42);
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      updateCameraRotation();
      return;
    }
    updateHover(event);
  });

  renderer.domElement.addEventListener("pointerup", (event) => {
    event.preventDefault();
    if (event.pointerType !== "touch") return;

    dragging = false;
    if (dragDistance > 8) return;
    const hit = getPointerHit(event);
    if (hit?.object?.userData?.artwork) {
      selectArtwork(hit.object.userData.artwork, hit.object.userData.frame);
    }
  });

  renderer.domElement.addEventListener("pointercancel", () => {
    dragging = false;
  });

  renderer.domElement.addEventListener("touchstart", preventTouchScroll, { passive: false });
  renderer.domElement.addEventListener("touchmove", preventTouchScroll, { passive: false });
  renderer.domElement.addEventListener("touchend", preventTouchScroll, { passive: false });

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== renderer.domElement) return;
    yaw -= event.movementX * 0.0026;
    pitch = clamp(pitch - event.movementY * 0.0021, -0.82, 0.42);
    updateCameraRotation();
    updateCenterHover();
  });

  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== renderer.domElement) {
      clickable.forEach((object) => {
        const objectFrame = object.userData.frame;
        if (objectFrame !== selectedFrame) objectFrame.material.color.setHex(0x241b14);
      });
    } else {
      updateCenterHover();
    }
  });

  window.addEventListener("keydown", (event) => keys.add(event.key.toLowerCase()));
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

  setupMobileJoystick();
  setupMobileFullscreen();
}

function preventTouchScroll(event) {
  event.preventDefault();
}

function setupMobileFullscreen() {
  if (!fullscreenButton) return;

  fullscreenButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  fullscreenButton.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (document.body.classList.contains("v106-mobile-fullscreen")) {
      await exitMobileFullscreen();
    } else {
      await enterMobileFullscreen();
    }
  });

  document.addEventListener("fullscreenchange", syncMobileFullscreenButton);
  window.addEventListener("orientationchange", () => window.setTimeout(onResize, 220));
  syncMobileFullscreenButton();
}

async function enterMobileFullscreen() {
  document.body.classList.add("v106-mobile-fullscreen");
  syncMobileFullscreenButton();
  window.setTimeout(onResize, 60);

  try {
    if (document.fullscreenElement !== document.querySelector(".v106-stage")) {
      await document.querySelector(".v106-stage")?.requestFullscreen?.();
    }
  } catch {
    // Some mobile browsers do not allow fullscreen on arbitrary elements.
  }

  try {
    await screen.orientation?.lock?.("landscape");
  } catch {
    // Orientation lock is best-effort and often limited by browser policy.
  }

  window.setTimeout(onResize, 220);
}

async function exitMobileFullscreen() {
  document.body.classList.remove("v106-mobile-fullscreen");
  syncMobileFullscreenButton();

  try {
    screen.orientation?.unlock?.();
  } catch {
    // Ignore browsers without orientation unlock support.
  }

  try {
    if (document.fullscreenElement) await document.exitFullscreen?.();
  } catch {
    // Ignore fullscreen exit errors; the CSS fullscreen class has already been removed.
  }

  window.setTimeout(onResize, 80);
}

function syncMobileFullscreenButton() {
  if (!fullscreenButton) return;
  const isFullscreen = document.body.classList.contains("v106-mobile-fullscreen") || !!document.fullscreenElement;
  if (!isFullscreen) document.body.classList.remove("v106-mobile-fullscreen");
  fullscreenButton.textContent = isFullscreen ? "退出全屏" : "横屏全屏";
}

function setupMobileJoystick() {
  const joystick = document.getElementById("v106Joystick");
  const knob = document.getElementById("v106JoystickKnob");
  if (!joystick || !knob) return;

  const resetJoystick = () => {
    joystickPointerId = null;
    mobileStick.x = 0;
    mobileStick.y = 0;
    knob.style.transform = "translate3d(0, 0, 0)";
  };

  const updateJoystick = (event) => {
    if (joystickPointerId !== null && event.pointerId !== joystickPointerId) return;
    event.preventDefault();
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width * 0.36;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    const clampedDistance = Math.min(distance, maxRadius);
    if (distance > 0) {
      dx = (dx / distance) * clampedDistance;
      dy = (dy / distance) * clampedDistance;
    }
    const deadZone = 0.12;
    mobileStick.x = Math.abs(dx / maxRadius) < deadZone ? 0 : dx / maxRadius;
    mobileStick.y = Math.abs(dy / maxRadius) < deadZone ? 0 : dy / maxRadius;
    knob.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  };

  joystick.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    joystickPointerId = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    updateJoystick(event);
  });
  joystick.addEventListener("pointermove", updateJoystick);
  joystick.addEventListener("pointerup", (event) => {
    event.preventDefault();
    resetJoystick();
  });
  joystick.addEventListener("pointercancel", (event) => {
    event.preventDefault();
    resetJoystick();
  });
  joystick.addEventListener("touchstart", preventTouchScroll, { passive: false });
  joystick.addEventListener("touchmove", preventTouchScroll, { passive: false });
  joystick.addEventListener("touchend", preventTouchScroll, { passive: false });
}

function updateHover(event) {
  const hit = getPointerHit(event);
  setHoverFrame(hit?.object?.userData?.frame || null);
}

function updateCenterHover() {
  const hit = getCenterHit();
  setHoverFrame(hit?.object?.userData?.frame || null);
}

function setHoverFrame(frame) {
  if (frame === selectedFrame) return;
  clickable.forEach((object) => {
    const objectFrame = object.userData.frame;
    if (objectFrame !== selectedFrame) objectFrame.material.color.setHex(0x241b14);
  });
  if (frame) frame.material.color.setHex(0x8b3f2f);
}

function getPointerHit(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(clickable, false)[0];
}

function getCenterHit() {
  pointer.set(0, 0);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(clickable, false)[0];
}

function selectArtwork(artwork, frame) {
  if (selectedFrame) selectedFrame.material.color.setHex(0x241b14);
  selectedFrame = frame;
  selectedFrame.material.color.setHex(0xc46a4a);

  info.code.textContent = artwork.id;
  info.title.textContent = artwork.title;
  info.desc.textContent = artwork.desc;
  info.meta.textContent = artwork.meta;
  info.use.textContent = artwork.specialInteraction
    ? "这是后续 Web 版尖大互动入口：结构、故事、进入画面会分阶段迁移。"
    : "网页端展示、案例库入口、AR 模型入口和后续合作沟通。";
  info.link.href = artwork.page;
  info.link.textContent = `查看 ${artwork.id} 案例页`;
}

function updateInfoIntro() {
  info.code.textContent = "METRION-WEB-GALLERY";
  info.title.textContent = "一个可交付给展览空间的线上展厅样板。";
  info.desc.textContent =
    "这是元维构把 Quest VR 美术馆经验迁移到网页和移动端的展示样板。它既展示元维构项目自身，也说明我们可以为其他美术馆、画廊和展示空间搭建可浏览、可导览、可传播的 3D 线上展厅。";
  info.meta.textContent = "网页 3D 展厅、移动端横屏全屏浏览、作品信息面板、模型按距离加载。";
  info.use.textContent = "远程观展、展览推广、教育导览、方案提案、馆方数字档案入口。";
  info.link.href = "https://wj.qq.com/s2/26765122/e267/";
  info.link.textContent = "咨询展厅建设";
}

function updateCameraRotation() {
  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function moveCamera(delta) {
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
  const move = new THREE.Vector3();

  if (keys.has("w") || keys.has("arrowup")) move.add(forward);
  if (keys.has("s") || keys.has("arrowdown")) move.sub(forward);
  if (keys.has("a") || keys.has("arrowleft")) move.sub(right);
  if (keys.has("d") || keys.has("arrowright")) move.add(right);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(delta * 3.1);
    camera.position.add(move);
  }

  if (mobileStick.x !== 0 || mobileStick.y !== 0) {
    camera.position.addScaledVector(right, mobileStick.x * delta * 2.55);
    camera.position.addScaledVector(forward, -mobileStick.y * delta * 2.55);
  }

  clampCameraToGallery();
}

function clampCameraToGallery() {
  camera.position.x = clamp(camera.position.x, -5.55, 5.55);
  camera.position.z = clamp(camera.position.z, -25.0, 7.6);
  camera.position.y = 1.58;
  if (camera.position.z < -8.2 && camera.position.z > -9.8 && Math.abs(camera.position.x) > 1.2) {
    camera.position.z = camera.position.z > -9 ? -8.2 : -9.8;
  }
}

function updateHallLabel() {
  hallLabel.textContent = camera.position.z > -9 ? "主展厅样本" : "第二展厅样本";
}

function updateLoading() {
  const { loaded, total } = loadNearModels();
  const text = `已按距离加载模型 ${loaded} / ${total}`;
  if (text !== lastLoadingText) {
    loading.textContent = text;
    lastLoadingText = text;
  }
}

function render(time) {
  const delta = Math.min(0.05, (time - lastTime) / 1000);
  lastTime = time;
  moveCamera(delta);
  updateHallLabel();
  if (time - lastModelLoadCheck > 360) {
    updateLoading();
    lastModelLoadCheck = time;
  }
  renderer.render(scene, camera);
}

function onResize() {
  const width = mount.clientWidth || window.innerWidth;
  const height = mount.clientHeight || window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function makeFloorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#d5cec0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < 512; y += 64) {
    for (let x = 0; x < 512; x += 128) {
      const offset = y % 128 === 0 ? 0 : 64;
      ctx.fillStyle = (x + y) % 256 === 0 ? "#c9c1b2" : "#ded7ca";
      ctx.fillRect(x + offset - 64, y + 2, 122, 58);
      ctx.strokeStyle = "rgba(94,86,74,0.18)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + offset - 64, y + 2, 122, 58);
      ctx.strokeStyle = "rgba(112,104,92,0.18)";
      ctx.beginPath();
      ctx.moveTo(x + offset - 56, y + 30);
      ctx.bezierCurveTo(x + offset - 16, y + 18, x + offset + 22, y + 42, x + offset + 54, y + 28);
      ctx.stroke();
    }
  }
  return new THREE.CanvasTexture(canvas);
}

function makeWallTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e8e4d9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 900; i += 1) {
    const alpha = Math.random() * 0.035;
    ctx.fillStyle = `rgba(80,74,64,${alpha})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1);
  }
  return new THREE.CanvasTexture(canvas);
}

function makeCeilingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#d7ebef";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < 512; y += 128) {
    for (let x = 0; x < 512; x += 128) {
      const gradient = ctx.createRadialGradient(x + 64, y + 64, 8, x + 64, y + 64, 74);
      gradient.addColorStop(0, "#f7ffff");
      gradient.addColorStop(1, "#cfe4e8");
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 12, y + 12, 104, 104);
      ctx.strokeStyle = "#8b8780";
      ctx.lineWidth = 8;
      ctx.strokeRect(x + 6, y + 6, 116, 116);
      ctx.strokeStyle = "rgba(78,76,72,0.32)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 22, y + 22, 84, 84);
    }
  }
  return new THREE.CanvasTexture(canvas);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
