import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRButton } from "three/addons/webxr/VRButton.js";

const assetRoot = "./assets/virtual-gallery-v57";
const galleryBuild = "v57-20260530";
const mount = document.getElementById("virtualGalleryCanvas");
const loading = document.getElementById("vgLoading");
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
    id: "TS01-001",
    title: "Laws of night and honey",
    meta: "Emma McIntyre / 当代绘画样本",
    desc: "把画面中的笔触重心、墨色层次和留白关系转译为轻盈的空间结构。",
    wall: "ts01-001-wall.jpg",
    card: "ts01-001-card.png",
    model: "ts01-001-model.glb",
    page: "./cases/samples/ts01-001.html",
  },
  {
    id: "TS01-002",
    title: "Portrait of Princesse de Broglie",
    meta: "Jean-Auguste-Dominique Ingres / 1853",
    desc: "人物姿态、服饰褶皱和画面重心被组织为可近距离观看的空间层级。",
    wall: "ts01-002-wall.jpg",
    card: "ts01-002-card.png",
    model: "ts01-002-model.glb",
    page: "./cases/samples/ts01-002.html",
  },
  {
    id: "TS01-003",
    title: "The Garden of Earthly Delights",
    meta: "Hieronymus Bosch / 约 1490-1510",
    desc: "从复杂叙事绘画中提取人物、场景和前后关系，形成空间叙事模型。",
    wall: "ts01-003-wall.jpg",
    card: "ts01-003-card.png",
    model: "ts01-003-model.glb",
    page: "./cases/samples/ts01-003.html",
  },
  {
    id: "TS01-030",
    title: "尖大",
    meta: "Young Artist / 当代青少年艺术样本",
    desc: "青年艺术家的图像轮廓、陌生化角色和视觉重心被整理为可进入展厅的结构样本。",
    wall: "ts01-030-wall.jpg",
    card: "ts01-030-card.png",
    model: "ts01-030-model.glb",
    page: "./cases/samples/ts01-030.html",
  },
  {
    id: "TS01-008",
    title: "亀户梅屋铺",
    meta: "Utagawa Hiroshige / 1857",
    desc: "枝干路径、画面切割和色彩节奏被转译为空间构成。",
    wall: "ts01-008-wall.jpg",
    card: "ts01-008-card.png",
    model: "ts01-008-model.glb",
    page: "./cases/samples/ts01-008.html",
  },
  {
    id: "TS01-006",
    title: "Stolas",
    meta: "地狱辞典插图 / 19 世纪图像样本",
    desc: "主体轮廓、羽毛层次和装饰关系被转译为立体版本。",
    wall: "ts01-006-wall.jpg",
    card: "ts01-006-card.png",
    model: "ts01-006-model.glb",
    page: "./cases/samples/ts01-006.html",
  },
  {
    id: "TS01-007",
    title: "富士山三十六景",
    meta: "Utagawa Hiroshige / 浮世绘样本",
    desc: "风景画中的远近层次、地貌走势和视觉方向被转换为浅浮雕结构。",
    wall: "ts01-007-wall.jpg",
    card: "ts01-007-card.png",
    model: "ts01-007-model.glb",
    page: "./cases/samples/ts01-007.html",
  },
  {
    id: "TS01-023",
    title: "JOB",
    meta: "Alphonse Mucha / 1896",
    desc: "从装饰性人物图像中提取姿态、发丝、边界和层级关系，转译为可陈列的立体模型。",
    wall: "ts01-023-wall.jpg",
    card: "ts01-023-card.png",
    model: "ts01-023-model.glb",
    page: "./cases/samples/ts01-023.html",
  },
  {
    id: "TS01-009",
    title: "杂画册局部",
    meta: "金农 / 清代绘画样本",
    desc: "金农画面中的笔墨节奏、主体姿态和留白关系被组织为结构样本。",
    wall: "ts01-009-wall.jpg",
    card: "ts01-009-card.png",
    model: "ts01-009-model.glb",
    page: "./cases/samples/ts01-009.html",
  },
  {
    id: "TS01-010",
    title: "Litzlberg am Attersee",
    meta: "Gustav Klimt / 1915",
    desc: "Klimt 风景中的色块边界、湖面层次和景深关系被转化为空间层级。",
    wall: "ts01-010-wall.jpg",
    card: "ts01-010-card.png",
    model: "ts01-010-model.glb",
    page: "./cases/samples/ts01-010.html",
  },
  {
    id: "TS01-011",
    title: "五角星",
    meta: "Contemporary Artist China / 当代艺术样本",
    desc: "星形轮廓与内部结构被转化为独立空间节点。",
    wall: "ts01-011-wall.jpg",
    card: "ts01-011-card.png",
    model: "ts01-011-model.glb",
    page: "./cases/samples/ts01-011.html",
  },
  {
    id: "TS01-012",
    title: "Betty",
    meta: "Gerhard Richter / 1988",
    desc: "人物姿态、转身关系和画面边界被整理为可观看、可说明的空间结构。",
    wall: "ts01-012-wall.jpg",
    card: "ts01-012-card.png",
    model: "ts01-012-model.glb",
    page: "./cases/samples/ts01-012.html",
  },
];

let renderer;
let camera;
let scene;
let controls;
let player;
let raycaster;
let pointer;
let selectedFrame = null;
let hoveredFrame = null;
let loadedModels = 0;
const clickable = [];
const controllers = [];
const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
const tempMatrix = new THREE.Matrix4();
const tempVec = new THREE.Vector3();

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x151515);
  scene.fog = new THREE.Fog(0x151515, 18, 36);

  const width = mount.clientWidth || 900;
  const height = mount.clientHeight || 760;

  player = new THREE.Group();
  scene.add(player);

  camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 120);
  camera.position.set(0, 2.0, 12.2);
  player.add(camera);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = false;
  mount.appendChild(renderer.domElement);
  mount.appendChild(VRButton.createButton(renderer));

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.55, -2.0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 5.5;
  controls.maxDistance = 24;

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  addLights();
  addRoom();
  addArtworksAndCards();
  addFeatureModels();
  addControllers();
  showGalleryIntro();

  window.addEventListener("resize", onResize);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.setAnimationLoop(render);
}

function addLights() {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x39322b, 1.25));

  const key = new THREE.DirectionalLight(0xffffff, 2.25);
  key.position.set(1.5, 7.5, 6);
  scene.add(key);

  [-12.8, -8.4, -4.0, 0.4, 4.8, 9.2].forEach((z) => {
    const left = new THREE.PointLight(0xffefd2, 1.1, 7.5);
    left.position.set(-4.8, 3.65, z);
    scene.add(left);

    const right = new THREE.PointLight(0xffefd2, 1.1, 7.5);
    right.position.set(4.8, 3.65, z);
    scene.add(right);
  });
}

function addRoom() {
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c3, roughness: 0.78 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xefeadf, roughness: 0.88 });
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x302b24, roughness: 0.62 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x211d18, roughness: 0.6 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 28), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -2;
  scene.add(floor);

  addGridFloor();

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.8), wallMat);
  backWall.position.set(0, 2.4, -15.8);
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(28, 4.8), wallMat);
  leftWall.position.set(-7, 2.4, -2);
  leftWall.rotation.y = Math.PI / 2;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(28, 4.8), wallMat);
  rightWall.position.set(7, 2.4, -2);
  rightWall.rotation.y = -Math.PI / 2;
  scene.add(rightWall);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(14, 28), ceilingMat);
  ceiling.position.set(0, 4.82, -2);
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  const titleTexture = new THREE.CanvasTexture(makeTextCanvas("METRION VIRTUAL MUSEUM", "结构成为空间"));
  titleTexture.colorSpace = THREE.SRGBColorSpace;
  const titleMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 1.08),
    new THREE.MeshBasicMaterial({ map: titleTexture, transparent: true })
  );
  titleMesh.position.set(0, 3.22, -15.74);
  scene.add(titleMesh);

  const portal = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.8, 0.08), trimMat);
  portal.position.set(0, 1.4, -15.7);
  scene.add(portal);
}

function addGridFloor() {
  const material = new THREE.LineBasicMaterial({ color: 0xc9c0b2, transparent: true, opacity: 0.45 });
  const points = [];
  for (let x = -7; x <= 7; x += 1) {
    points.push(new THREE.Vector3(x, 0.012, -16), new THREE.Vector3(x, 0.012, 12));
  }
  for (let z = -16; z <= 12; z += 1) {
    points.push(new THREE.Vector3(-7, 0.012, z), new THREE.Vector3(7, 0.012, z));
  }
  const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), material);
  scene.add(lines);
}

function addArtworksAndCards() {
  const leftZ = [-13.1, -8.7, -4.3, 0.1, 4.5, 8.9];
  const rightZ = [-13.1, -8.7, -4.3, 0.1, 4.5, 8.9];

  artworks.forEach((artwork, index) => {
    const isLeft = index < 6;
    const z = isLeft ? leftZ[index] : rightZ[index - 6];
    const wallX = isLeft ? -6.92 : 6.92;
    const rotY = isLeft ? Math.PI / 2 : -Math.PI / 2;
    const side = isLeft ? -1 : 1;

    const artGroup = createArtworkGroup(artwork, index);
    artGroup.position.set(wallX, 2.0, z);
    artGroup.rotation.y = rotY;
    scene.add(artGroup);

    const cardGroup = createCardGroup(artwork);
    cardGroup.position.set(wallX, 2.02, z + side * 2.05);
    cardGroup.rotation.y = rotY;
    scene.add(cardGroup);
  });
}

function createArtworkGroup(artwork, index) {
  const group = new THREE.Group();
  group.userData.artwork = artwork;

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 1.36, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x201811, roughness: 0.58 })
  );
  group.add(frame);

  const backing = new THREE.Mesh(
    new THREE.PlaneGeometry(0.91, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xfffbef, roughness: 0.88 })
  );
  backing.position.z = 0.046;
  group.add(backing);

  const texture = textureLoader.load(`${assetRoot}/wall/${artwork.wall}`);
  texture.colorSpace = THREE.SRGBColorSpace;
  const art = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 1.05),
    new THREE.MeshBasicMaterial({ map: texture, color: 0xffffff })
  );
  art.position.set(0, 0.035, 0.056);
  art.userData = { artwork, frame };
  group.add(art);
  clickable.push(art);

  const labelTexture = new THREE.CanvasTexture(makeLabelCanvas(`${String(index + 1).padStart(2, "0")} / ${artwork.id}`));
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.88, 0.14),
    new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true })
  );
  label.position.set(0, -0.59, 0.06);
  group.add(label);

  return group;
}

function createCardGroup(artwork) {
  const group = new THREE.Group();
  const cardTexture = textureLoader.load(`${assetRoot}/cards/${artwork.card}`);
  cardTexture.colorSpace = THREE.SRGBColorSpace;
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(1.52, 0.93),
    new THREE.MeshBasicMaterial({ map: cardTexture, color: 0xffffff })
  );
  card.position.z = 0.055;
  group.add(card);

  const railMat = new THREE.MeshStandardMaterial({ color: 0x74442e, roughness: 0.62 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.035, 0.035), railMat);
  top.position.set(0, 0.485, 0.03);
  group.add(top);
  const bottom = top.clone();
  bottom.position.y = -0.485;
  group.add(bottom);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.0, 0.035), railMat);
  left.position.set(-0.8, 0, 0.03);
  group.add(left);
  const right = left.clone();
  right.position.x = 0.8;
  group.add(right);

  return group;
}

function addFeatureModels() {
  const leftZ = [-13.1, -8.7, -4.3, 0.1, 4.5, 8.9];
  const rightZ = [-13.1, -8.7, -4.3, 0.1, 4.5, 8.9];

  artworks.forEach((artwork, index) => {
    const isLeft = index < 6;
    const z = isLeft ? leftZ[index] : rightZ[index - 6];
    const x = isLeft ? -5.28 : 5.28;
    const rotationY = isLeft ? Math.PI / 2 : -Math.PI / 2;
    const position = new THREE.Vector3(x, 0, z);
    addPedestal(position);
    loadFeatureModel(artwork, position, rotationY);
  });
}

function addPedestal(position) {
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.52, 0.56, 36),
    new THREE.MeshStandardMaterial({ color: 0xf3ebdf, roughness: 0.72 })
  );
  pedestal.position.set(position.x, 0.28, position.z);
  scene.add(pedestal);
}

function loadFeatureModel(artwork, position, rotationY) {
  gltfLoader.load(
    `${assetRoot}/models/${artwork.model}`,
    (gltf) => {
      const model = gltf.scene;
      model.rotation.y = rotationY;
      model.traverse((child) => {
        if (child.isMesh) {
          child.frustumCulled = true;
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 0.68 / maxDim;
      model.scale.setScalar(scale);
      model.position.set(position.x - center.x * scale, 0.62 - box.min.y * scale, position.z - center.z * scale);
      scene.add(model);
      loadedModels += 1;
      updateLoading();
    },
    undefined,
    () => {
      addModelFallback(artwork, position);
      loadedModels += 1;
      updateLoading();
    }
  );
}

function addModelFallback(artwork, position) {
  const fallback = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.58, 0.58),
    new THREE.MeshStandardMaterial({ color: 0xb7b0a4, roughness: 0.5 })
  );
  fallback.position.set(position.x, 0.9, position.z);
  fallback.userData.artwork = artwork;
  scene.add(fallback);
}

function updateLoading() {
  if (!loading) return;
  loading.textContent = `已载入 ${loadedModels} / ${artworks.length} 个模型`;
  if (loadedModels >= artworks.length) {
    loading.textContent = "虚拟展厅资源已载入";
    window.setTimeout(() => {
      loading.style.display = "none";
    }, 1400);
  }
}

function addControllers() {
  for (let i = 0; i < 2; i += 1) {
    const controller = renderer.xr.getController(i);
    controller.addEventListener("selectstart", () => selectFromController(controller));
    scene.add(controller);

    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -5)]),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.58 })
    );
    controller.add(line);
    controllers.push(controller);
  }
}

function onPointerMove(event) {
  const hit = getPointerHit(event);
  setHover(hit?.object || null);
}

function onPointerDown(event) {
  const hit = getPointerHit(event);
  if (hit?.object?.userData?.artwork) {
    selectArtwork(hit.object.userData.artwork, hit.object.userData.frame);
  }
}

function getPointerHit(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(clickable, false)[0];
}

function selectFromController(controller) {
  const hit = getControllerHit(controller);
  if (hit?.object?.userData?.artwork) {
    selectArtwork(hit.object.userData.artwork, hit.object.userData.frame);
  }
}

function getControllerHit(controller) {
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
  return raycaster.intersectObjects(clickable, false)[0];
}

function updateControllerHover() {
  let bestHit = null;
  for (const controller of controllers) {
    const hit = getControllerHit(controller);
    if (hit && (!bestHit || hit.distance < bestHit.distance)) {
      bestHit = hit;
    }
  }
  setHover(bestHit?.object || null);
}

function setHover(object) {
  if (hoveredFrame && hoveredFrame !== selectedFrame) {
    hoveredFrame.material.color.setHex(0x201811);
  }
  hoveredFrame = object?.userData?.frame || null;
  if (hoveredFrame && hoveredFrame !== selectedFrame) {
    hoveredFrame.material.color.setHex(0x8b3f2f);
  }
}

function selectArtwork(artwork, frame) {
  if (selectedFrame) {
    selectedFrame.material.color.setHex(0x201811);
  }
  selectedFrame = frame;
  if (selectedFrame) {
    selectedFrame.material.color.setHex(0xc46a4a);
  }

  info.code.textContent = artwork.id;
  info.title.textContent = artwork.title;
  info.desc.textContent = artwork.desc;
  info.origin.textContent = artwork.meta;
  info.process.textContent = artwork.desc;
  info.use.textContent = "线上展览、展签说明、数字档案、馆方沟通和授权前展示。";
  info.rights.textContent = "展示用途；具体授权需根据原作权属和使用场景确认。";
  info.link.href = artwork.page;
  info.link.textContent = `查看 ${artwork.id} 样本页`;
}

function showGalleryIntro() {
  info.code.textContent = "METRION VIRTUAL MUSEUM";
  info.title.textContent = "虚拟美术馆服务样板";
  info.desc.textContent = "这是元维构为美术馆、画廊、艺术节和商业展示空间准备的虚拟展馆服务样本：把线下展览内容整理为可远程浏览、可持续传播、可连接授权与衍生开发的线上空间。";
  info.origin.textContent = "面向线下美术馆与展览空间的虚拟展馆搭建服务";
  info.process.textContent = "从作品资料、展签、现场布置和三维转译模型出发，搭建一个可在网页、移动端和 WebXR 中访问的展览空间。";
  info.use.textContent = "展前预览、远程观展、教育导览、赞助汇报、数字档案、展览延期传播。";
  info.rights.textContent = "展示用途；具体授权需根据原作权属和使用场景确认。";
  info.link.href = "./cases/test-series.html";
  info.link.textContent = "查看测试系列案例库";
}

function movePlayer() {
  const session = renderer.xr.getSession();
  if (!session) return;

  const xrCamera = renderer.xr.getCamera(camera);
  xrCamera.getWorldDirection(tempVec);
  tempVec.y = 0;
  tempVec.normalize();
  const forward = tempVec.clone();
  const right = new THREE.Vector3(forward.z, 0, -forward.x).normalize();

  let moveX = 0;
  let moveZ = 0;
  for (const source of session.inputSources) {
    const axes = source.gamepad?.axes;
    if (!axes || axes.length < 2) continue;
    const xAxis = axes[2] ?? axes[0] ?? 0;
    const yAxis = axes[3] ?? axes[1] ?? 0;
    moveX += Math.abs(xAxis) > 0.16 ? xAxis : 0;
    moveZ += Math.abs(yAxis) > 0.16 ? yAxis : 0;
  }

  const speed = 0.055;
  player.position.addScaledVector(right, moveX * speed);
  player.position.addScaledVector(forward, -moveZ * speed);
  player.position.x = THREE.MathUtils.clamp(player.position.x, -4.8, 4.8);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -13.8, 10.6);
}

function render() {
  controls.update();
  if (renderer.xr.isPresenting) {
    updateControllerHover();
    movePlayer();
  }
  renderer.render(scene, camera);
}

function onResize() {
  const width = mount.clientWidth || window.innerWidth;
  const height = mount.clientHeight || 760;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function makeTextCanvas(title, subtitle) {
  const canvas = document.createElement("canvas");
  canvas.width = 1150;
  canvas.height = 280;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,251,242,0.94)";
  roundRect(ctx, 20, 20, 1110, 240, 24);
  ctx.fill();
  ctx.fillStyle = "#171717";
  ctx.font = "700 58px Arial, 'Microsoft YaHei', sans-serif";
  ctx.fillText(title, 64, 116);
  ctx.fillStyle = "#8b3f2f";
  ctx.font = "700 38px Arial, 'Microsoft YaHei', sans-serif";
  ctx.fillText(subtitle, 64, 182);
  return canvas;
}

function makeLabelCanvas(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 700;
  canvas.height = 110;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(255,251,242,0.96)";
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 16);
  ctx.fill();
  ctx.fillStyle = "#171717";
  ctx.font = "700 34px Arial, 'Microsoft YaHei', sans-serif";
  ctx.fillText(text, 30, 68);
  return canvas;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = Array.from(text);
  let line = "";
  for (const char of chars) {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = char;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
