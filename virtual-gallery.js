import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRButton } from "three/addons/webxr/VRButton.js";

const mount = document.getElementById("virtualGalleryCanvas");
const info = {
  code: document.getElementById("vgCode"),
  title: document.getElementById("vgTitle"),
  desc: document.getElementById("vgDesc"),
  origin: document.getElementById("vgOrigin"),
  process: document.getElementById("vgProcess"),
  use: document.getElementById("vgUse"),
  rights: document.getElementById("vgRights"),
  link: document.getElementById("vgCaseLink"),
};

const artworks = [
  {
    code: "TP-2026-SGM-TS01-001",
    title: "水墨结构样本",
    image: "./assets/sample-archive/intro-01.jpg",
    page: "./cases/samples/ts01-001.html",
    origin: "测试系列 001 / 平面作品结构研究",
    process: "从水墨笔触与重心关系中提取空间层级。",
    use: "可用于虚拟展签、数字档案与结构转译方法说明。",
  },
  {
    code: "TP-2026-SGM-TS01-002",
    title: "人物绘画结构样本",
    image: "./assets/sample-archive/intro-02.jpg",
    page: "./cases/samples/ts01-002.html",
    origin: "测试系列 002 / 具象人物作品",
    process: "保留人物轮廓、姿态与主要视觉重心，转化为层级结构。",
    use: "适合展示具象绘画如何进入空间版本。",
  },
  {
    code: "TP-2026-SGM-TS01-003",
    title: "古典叙事结构样本",
    image: "./assets/sample-archive/intro-03.jpg",
    page: "./cases/samples/ts01-003.html",
    origin: "测试系列 003 / 历史绘画样本",
    process: "将画面叙事关系拆解为前后景与主体体量。",
    use: "可作为经典图像空间化研究样本。",
  },
  {
    code: "TP-2026-SGM-TS01-004",
    title: "线性构成结构样本",
    image: "./assets/sample-archive/intro-04.jpg",
    page: "./cases/samples/ts01-004.html",
    origin: "测试系列 004 / 线稿与构成关系",
    process: "从线条路径中寻找支撑结构与空间方向。",
    use: "适合说明线稿作品转译的边界与可能。",
  },
  {
    code: "TP-2026-SGM-TS01-005",
    title: "色块构成结构样本",
    image: "./assets/sample-archive/intro-05.jpg",
    page: "./cases/samples/ts01-005.html",
    origin: "测试系列 005 / 色彩与构成样本",
    process: "将色块之间的张力转化为可观看的空间关系。",
    use: "可用于色彩结构转译与虚拟展墙展示。",
  },
  {
    code: "TP-2026-SGM-TS01-006",
    title: "传统图像结构样本",
    image: "./assets/sample-archive/intro-06.jpg",
    page: "./cases/samples/ts01-006.html",
    origin: "测试系列 006 / 传统绘画样本",
    process: "从平面构图中提取可转译的主体与层次。",
    use: "适合博物馆、艺术教育与展览导览。",
  },
  {
    code: "TP-2026-SGM-TS01-007",
    title: "浮雕方向样本",
    image: "./assets/sample-archive/intro-07.jpg",
    page: "./cases/samples/ts01-007.html",
    origin: "测试系列 007 / 浮雕结构研究",
    process: "将画面转为浅空间关系，适合墙面与展签系统。",
    use: "可用于现实展览旁的数字模型补充。",
  },
  {
    code: "TP-2026-SGM-TS01-008",
    title: "现代构成结构样本",
    image: "./assets/sample-archive/intro-08.jpg",
    page: "./cases/samples/ts01-008.html",
    origin: "测试系列 008 / 现代主义构成样本",
    process: "将几何关系、色块边界与视觉节奏转为空间模块。",
    use: "适合授权评估、空间装置与虚拟美术馆演示。",
  },
  {
    code: "TP-2026-SGM-TS01-009",
    title: "雕塑转译样本",
    image: "./assets/sample-archive/intro-09.jpg",
    page: "./cases/samples/ts01-009.html",
    origin: "测试系列 009 / 既有雕塑的结构再记录",
    process: "对已有三维作品进行结构数字化与档案化呈现。",
    use: "适合作为空间数字档案中的雕塑记录样本。",
  },
  {
    code: "TP-2026-SGM-TS01-010",
    title: "抽象张力结构样本",
    image: "./assets/sample-archive/intro-10.jpg",
    page: "./cases/samples/ts01-010.html",
    origin: "测试系列 010 / 抽象作品样本",
    process: "从不可直接具象化的画面中提取张力结构。",
    use: "用于说明不是所有作品都做复制，而是做判断。",
  },
  {
    code: "TP-2026-SGM-TS01-011",
    title: "星形结构样本",
    image: "./assets/sample-archive/intro-11.jpg",
    page: "./cases/samples/ts01-011.html",
    origin: "测试系列 011 / 当代艺术图像样本",
    process: "提取星形轮廓与内部破碎结构，形成空间构成。",
    use: "适合虚拟展厅中的独立节点展示。",
  },
  {
    code: "TP-2026-SGM-TS01-012",
    title: "空间组合结构样本",
    image: "./assets/sample-archive/intro-12.jpg",
    page: "./cases/samples/ts01-012.html",
    origin: "测试系列 012 / 综合结构样本",
    process: "将画面中的多个元素组织为可绕行观看的空间结构。",
    use: "可作为后续 MR、VR 和展览数字资产的基础。",
  },
];

let renderer;
let camera;
let scene;
let controls;
let raycaster;
let pointer;
let selectedFrame = null;
let clickable = [];
let controllerRaycaster;
const textureLoader = new THREE.TextureLoader();

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1b1b1b);
  scene.fog = new THREE.Fog(0x1b1b1b, 13, 25);

  const width = mount.clientWidth || 900;
  const height = mount.clientHeight || 720;

  camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 120);
  camera.position.set(0, 2.15, 8.6);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true;
  mount.appendChild(renderer.domElement);

  const vrButton = VRButton.createButton(renderer);
  vrButton.style.position = "absolute";
  vrButton.style.top = "18px";
  vrButton.style.left = "18px";
  vrButton.style.zIndex = "4";
  mount.appendChild(vrButton);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.35, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minDistance = 4.2;
  controls.maxDistance = 15;

  raycaster = new THREE.Raycaster();
  controllerRaycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  addLights();
  addRoom();
  addArtworks();
  addCentralModel();
  addControllers();
  selectArtwork(artworks[0], null);

  window.addEventListener("resize", onResize);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.setAnimationLoop(render);
}

function addLights() {
  const ambient = new THREE.HemisphereLight(0xffffff, 0x2b2824, 1.4);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(2, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const stripPositions = [
    [-4.8, 3.9, -4.5],
    [0, 3.9, -4.5],
    [4.8, 3.9, -4.5],
    [-5.9, 3.8, 0],
    [5.9, 3.8, 0],
  ];
  stripPositions.forEach(([x, y, z]) => {
    const light = new THREE.PointLight(0xfff1d5, 1.45, 8);
    light.position.set(x, y, z);
    scene.add(light);
  });
}

function addRoom() {
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xd8d0c3,
    roughness: 0.74,
    metalness: 0.02,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf2ede3,
    roughness: 0.86,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x343029,
    roughness: 0.62,
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.8), wallMat);
  backWall.position.set(0, 2.4, -6.8);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.8), wallMat);
  leftWall.position.set(-7, 2.4, 0);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.8), wallMat);
  rightWall.position.set(7, 2.4, 0);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), darkMat);
  ceiling.position.y = 4.82;
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  const grid = new THREE.GridHelper(14, 14, 0x8d8477, 0xc8bfb0);
  grid.position.y = 0.012;
  grid.material.opacity = 0.24;
  grid.material.transparent = true;
  scene.add(grid);

  const titleCanvas = makeTextCanvas("METRION VIRTUAL GALLERY", "结构成为空间");
  const titleTexture = new THREE.CanvasTexture(titleCanvas);
  titleTexture.colorSpace = THREE.SRGBColorSpace;
  const titleMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.9, 0.92),
    new THREE.MeshBasicMaterial({ map: titleTexture, transparent: true })
  );
  titleMesh.position.set(0, 3.25, -6.77);
  scene.add(titleMesh);
}

function addArtworks() {
  const placements = [
    { pos: [-4.9, 2.2, -6.72], rot: [0, 0, 0] },
    { pos: [-2.95, 2.2, -6.72], rot: [0, 0, 0] },
    { pos: [-1.0, 2.2, -6.72], rot: [0, 0, 0] },
    { pos: [1.0, 2.2, -6.72], rot: [0, 0, 0] },
    { pos: [2.95, 2.2, -6.72], rot: [0, 0, 0] },
    { pos: [4.9, 2.2, -6.72], rot: [0, 0, 0] },
    { pos: [-6.92, 2.1, -4.25], rot: [0, Math.PI / 2, 0] },
    { pos: [-6.92, 2.1, -1.85], rot: [0, Math.PI / 2, 0] },
    { pos: [-6.92, 2.1, 0.55], rot: [0, Math.PI / 2, 0] },
    { pos: [6.92, 2.1, -4.25], rot: [0, -Math.PI / 2, 0] },
    { pos: [6.92, 2.1, -1.85], rot: [0, -Math.PI / 2, 0] },
    { pos: [6.92, 2.1, 0.55], rot: [0, -Math.PI / 2, 0] },
  ];

  artworks.forEach((artwork, index) => {
    const placement = placements[index];
    const group = createArtworkGroup(artwork, index);
    group.position.set(...placement.pos);
    group.rotation.set(...placement.rot);
    scene.add(group);
  });
}

function createArtworkGroup(artwork, index) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.48, 1.92, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.55 })
  );
  frame.castShadow = true;
  frame.receiveShadow = true;
  group.add(frame);

  const backing = new THREE.Mesh(
    new THREE.PlaneGeometry(1.34, 1.74),
    new THREE.MeshStandardMaterial({ color: 0xfffbf2, roughness: 0.9 })
  );
  backing.position.z = 0.045;
  group.add(backing);

  const texture = textureLoader.load(artwork.image);
  texture.colorSpace = THREE.SRGBColorSpace;
  const art = new THREE.Mesh(
    new THREE.PlaneGeometry(1.18, 1.48),
    new THREE.MeshBasicMaterial({ map: texture, color: 0xffffff })
  );
  art.position.set(0, 0.09, 0.052);
  art.userData = { artwork, frame };
  group.add(art);
  clickable.push(art);

  const labelCanvas = makeLabelCanvas(`${String(index + 1).padStart(2, "0")} / ${artwork.code}`);
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.26, 0.18),
    new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true })
  );
  label.position.set(0, -0.83, 0.058);
  group.add(label);

  return group;
}

function addCentralModel() {
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.35, 0.72, 48),
    new THREE.MeshStandardMaterial({ color: 0xf5efe5, roughness: 0.7 })
  );
  pedestal.position.set(0, 0.36, -1.05);
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  scene.add(pedestal);

  const loader = new GLTFLoader();
  loader.load(
    "./assets/spatial-archive/you-can-call-me-ai.glb",
    (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 1.62 / maxDim;
      model.scale.setScalar(scale);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.set(-center.x * scale, 0.78 - box.min.y * scale, -1.05 - center.z * scale);
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(model);
    },
    undefined,
    () => {
      const placeholder = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.82, 2),
        new THREE.MeshStandardMaterial({ color: 0x9f8d76, roughness: 0.42, metalness: 0.15 })
      );
      placeholder.position.set(0, 1.32, -1.05);
      placeholder.castShadow = true;
      scene.add(placeholder);
    }
  );

  const labelCanvas = makeTextCanvas("Central Translated Object", "GLB spatial archive model");
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 0.45),
    new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true })
  );
  label.position.set(0, 0.55, 0.55);
  label.rotation.x = -0.42;
  scene.add(label);
}

function addControllers() {
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -4),
  ]);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });

  [0, 1].forEach((index) => {
    const controller = renderer.xr.getController(index);
    controller.addEventListener("select", () => onControllerSelect(controller));
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.name = "ray";
    controller.add(line);
    scene.add(controller);
  });
}

function onPointerDown(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickable, false)[0];
  if (hit) {
    selectArtwork(hit.object.userData.artwork, hit.object.userData.frame);
  }
}

function onControllerSelect(controller) {
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  controllerRaycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  controllerRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
  const hit = controllerRaycaster.intersectObjects(clickable, false)[0];
  if (hit) {
    selectArtwork(hit.object.userData.artwork, hit.object.userData.frame);
  }
}

function selectArtwork(artwork, frame) {
  if (selectedFrame) {
    selectedFrame.material.color.set(0x171717);
  }
  selectedFrame = frame;
  if (selectedFrame) {
    selectedFrame.material.color.set(0x8b3f2f);
  }

  info.code.textContent = artwork.code;
  info.title.textContent = artwork.title;
  info.desc.textContent = "该样本来自元维构测试系列，用于验证不同艺术语言进入虚拟展厅后的信息呈现、空间观看与数字档案连接。";
  info.origin.textContent = artwork.origin;
  info.process.textContent = artwork.process;
  info.use.textContent = artwork.use;
  info.rights.textContent = "测试展示用途；后续授权需根据原作权属确认。";
  info.link.href = artwork.page;
  info.link.textContent = "查看该样本页面";
}

function onResize() {
  const width = mount.clientWidth || 900;
  const height = mount.clientHeight || 720;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function render() {
  controls.update();
  renderer.render(scene, camera);
}

function makeLabelCanvas(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255, 253, 247, 0.96)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#8b3f2f";
  ctx.font = "700 52px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return canvas;
}

function makeTextCanvas(title, subtitle) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255, 253, 247, 0.92)";
  roundRect(ctx, 24, 24, 976, 312, 26);
  ctx.fill();
  ctx.fillStyle = "#171717";
  ctx.font = "800 70px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, canvas.width / 2, 150);
  ctx.fillStyle = "#8b3f2f";
  ctx.font = "700 40px Arial, sans-serif";
  ctx.fillText(subtitle, canvas.width / 2, 224);
  return canvas;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
