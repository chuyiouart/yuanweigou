import * as THREE from "three";

const mount = document.getElementById("tourCanvas");
const panel = document.getElementById("tourPanel");
const panelClose = document.getElementById("tourPanelClose");
const panelKicker = document.getElementById("tourPanelKicker");
const panelTitle = document.getElementById("tourPanelTitle");
const panelBody = document.getElementById("tourPanelBody");
const audienceGrid = document.getElementById("tourAudienceGrid");
const progressEl = document.getElementById("tourProgress");
const actionsEl = document.getElementById("tourActions");
const objectiveEl = document.getElementById("tourObjective");
const stepCountEl = document.getElementById("tourStepCount");
const audienceEl = document.getElementById("tourAudience");
const promptEl = document.getElementById("tourPrompt");
const resetButton = document.getElementById("tourReset");
const fullscreenButton = document.getElementById("tourFullscreen");
const joystick = document.getElementById("tourJoystick");
const stick = document.getElementById("tourStick");

const audiences = {
  artist: {
    label: "艺术家路径",
    intro: "从一件作品样本开始，看见它如何进入收藏版、展览记录和授权分成。",
    cta: [
      ["申请第一件样本", "./submit-check.html?source=interactive-tour&path=artist"],
      ["了解授权模式", "./licensing.html?source=interactive-tour&path=artist"],
    ],
  },
  family: {
    label: "家长路径",
    intro: "从孩子的一幅画出发，理解它如何被认真保存、包装和展示。",
    cta: [
      ["提交孩子作品判断", "./submit-check.html?source=interactive-tour&path=family"],
      ["查看青少年案例", "./cases/youth-creator.html?source=interactive-tour&path=family"],
    ],
  },
  education: {
    label: "教育机构路径",
    intro: "把课程成果从墙面作品升级为班级礼赠、成果展和数字档案。",
    cta: [
      ["查看机构套餐", "./education.html?source=interactive-tour&path=education#packages"],
      ["提交批量需求", "./submit-check.html?source=interactive-tour&path=education"],
    ],
  },
  museum: {
    label: "美术馆/画廊路径",
    intro: "把线下展览延展为网页 3D 展厅、展签二维码和可维护的数字档案。",
    cta: [
      ["查看虚拟展厅", "./virtual-gallery.html?source=interactive-tour&path=museum"],
      ["查看数字档案", "./spatial-archive.html?source=interactive-tour&path=museum"],
    ],
  },
};

const stations = [
  {
    id: "original",
    label: "原作",
    title: "第一站：从一幅二维作品开始",
    kicker: "Original",
    objective: "找到原作墙，查看作品是否具备结构转译潜力",
    position: new THREE.Vector3(-4.8, 1.45, 2.8),
    image: "./assets/case-youth-original.jpg",
    copy: {
      artist: "艺术家路径里，原作不是被替代，而是获得第二种存在方式。这里先判断主体、层次、色彩和作品语境。",
      family: "家长路径里，儿童画先被当作一次真实创作来对待。我们判断角色、故事、色彩和纪念价值，而不是简单复制图案。",
      education: "教育机构路径里，作品选择决定后续批量体验。适合优先挑选主体明确、故事完整、色彩识别度高的学生作品。",
      museum: "机构路径里，原作信息、作者、展期和公开范围会先进入档案结构，避免数字展示和授权边界混在一起。",
    },
  },
  {
    id: "translation",
    label: "转译",
    title: "第二站：把画面关系拆成空间结构",
    kicker: "Structural Translation",
    objective: "进入结构工作台，查看从画面到灰模的中间过程",
    position: new THREE.Vector3(0, 1.25, -3.4),
    image: "./assets/case-youth-production.jpg",
    copy: {
      artist: "这一站展示元维构的核心判断：视觉重心、前后层次、角色轮廓和空间关系会被整理成可制作的结构方案。",
      family: "孩子画里的角色、舞台和色彩会被保留下来，但会重新组织成更适合陈列、拿取和包装的立体形态。",
      education: "机构合作最需要标准流程：选作品、定尺寸、转译、制作、包装和编号，每一步都能被解释给家长。",
      museum: "展览项目里，这一层决定数字展厅不是图片陈列，而是把作品和空间关系组织成可浏览的展览叙事。",
    },
  },
  {
    id: "object",
    label: "实体",
    title: "第三站：实体样本成为可展示证据",
    kicker: "Physical Object",
    objective: "走到样本展柜，查看实体、包装和展示卡如何形成交付",
    position: new THREE.Vector3(4.8, 1.25, -8.8),
    image: "./assets/case-youth-display.jpg",
    copy: {
      artist: "实体样本可以进入展览、收藏版、衍生品测试和空间装置提案，是授权之前最直观的证明。",
      family: "对家庭来说，价值不只是模型本身，而是原作、成品、展示卡和包装一起构成的成长纪念。",
      education: "对机构来说，实体样本可以成为课程成果展、亲子活动和家长礼赠的核心展示模块。",
      museum: "对美术馆和画廊来说，实体物件、展签和空间动线可以和线上数字档案互相导流。",
    },
  },
  {
    id: "archive",
    label: "档案/授权",
    title: "第四站：进入数字档案与授权边界",
    kicker: "Archive & Rights",
    objective: "打开档案区，理解网页 3D、AR 和授权合作如何分层",
    position: new THREE.Vector3(0, 1.25, -15.2),
    image: "./assets/application-card.jpg",
    copy: {
      artist: "完成转译后，展示文件、档案记录、收藏版和授权分成可以分开管理，生产级文件不默认公开。",
      family: "家庭项目可以保留私密展示或公开展示的选择。儿童作品公开、宣传和商业使用需要单独确认。",
      education: "机构项目可以按班级、展期和年度合作维护档案，同时把公开展示、家长礼赠和销售用途分开确认。",
      museum: "展厅建设、二维码展签、AR 页面和长期维护可以成为机构服务包。数字展示不等于默认获得商业授权。",
    },
  },
];

const state = {
  audience: null,
  activeStation: null,
  completed: new Set(),
  keys: new Set(),
  mobile: { x: 0, y: 0, pointerId: null },
  yaw: 0,
  pitch: -0.04,
  dragging: false,
  lastX: 0,
  lastY: 0,
};

let scene;
let camera;
let renderer;
let raycaster;
let pointer;
let stationMeshes = [];
let clock;

init();

function init() {
  setupScene();
  setupWorld();
  setupInput();
  setupUi();
  updatePanelIntro();
  renderer.setAnimationLoop(render);
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xddd7ca);
  scene.fog = new THREE.Fog(0xddd7ca, 16, 34);

  const width = mount.clientWidth || window.innerWidth;
  const height = mount.clientHeight || window.innerHeight;
  camera = new THREE.PerspectiveCamera(62, width / height, 0.08, 80);
  camera.position.set(0, 1.58, 7.2);
  updateCameraRotation();

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.touchAction = "none";
  mount.appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  clock = new THREE.Clock();

  window.addEventListener("resize", onResize);
  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    objectiveEl.textContent = "WebGL 暂停，请刷新页面或切换到图文页面";
  });
}

function setupWorld() {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb7aa99, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(3, 7, 6);
  scene.add(key);

  addGalleryShell();
  addStations();
  addGuideLine();
}

function addGalleryShell() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 28),
    new THREE.MeshStandardMaterial({ color: 0xc9bba8, roughness: 0.86 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -6;
  scene.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 28),
    new THREE.MeshBasicMaterial({ color: 0xf2eadf })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 4.7, -6);
  scene.add(ceiling);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xeee7dc, roughness: 0.9 });
  addWall(0, 2.35, 8, 14, 4.7, 0, wallMat);
  addWall(0, 2.35, -20, 14, 4.7, Math.PI, wallMat);
  addWall(-7, 2.35, -6, 28, 4.7, Math.PI / 2, wallMat);
  addWall(7, 2.35, -6, 28, 4.7, -Math.PI / 2, wallMat);

  addTextPlane("让一幅画，成为一个空间", new THREE.Vector3(0, 2.75, 7.92), 4.6, 0.72, "#171717", "#f7f1e8");
  addTextPlane("原作  →  结构转译  →  实体样本  →  数字档案", new THREE.Vector3(0, 2.1, 7.91), 5.6, 0.44, "#5f5a52", "#f7f1e8");

  addBench(-2.4, -0.2);
  addBench(2.8, -11.8);
}

function addWall(x, y, z, width, height, rotationY, material) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  wall.position.set(x, y, z);
  wall.rotation.y = rotationY;
  scene.add(wall);
}

function addBench(x, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x5e5144, roughness: 0.78 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 0.54), mat);
  seat.position.set(x, 0.42, z);
  scene.add(seat);
  [-0.8, 0.8].forEach((offset) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.42), mat);
    leg.position.set(x + offset, 0.2, z);
    scene.add(leg);
  });
}

function addStations() {
  const textureLoader = new THREE.TextureLoader();
  stations.forEach((station, index) => {
    const group = new THREE.Group();
    group.position.copy(station.position);
    group.userData.stationId = station.id;

    const texture = textureLoader.load(station.image);
    texture.colorSpace = THREE.SRGBColorSpace;
    const image = new THREE.Mesh(
      new THREE.PlaneGeometry(1.65, 1.1),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
    );
    image.position.y = 0.82;
    group.add(image);

    addFrameBars(group, 1.86, 1.31, 0.82);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.86, 0.7, 32),
      new THREE.MeshStandardMaterial({ color: 0xf5efe5, roughness: 0.84 })
    );
    pedestal.position.y = -0.36;
    group.add(pedestal);

    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(0.86, 0.018, 12, 64),
      new THREE.MeshBasicMaterial({ color: 0x8c3c24 })
    );
    marker.rotation.x = Math.PI / 2;
    marker.position.y = -0.68;
    group.add(marker);

    const label = addTextSprite(`${index + 1}. ${station.label}`);
    label.position.set(0, 1.72, 0);
    group.add(label);

    if (station.id === "translation") {
      addLayerModel(group);
    } else if (station.id === "object") {
      addObjectModel(group);
    } else if (station.id === "archive") {
      addArchiveModel(group);
    }

    scene.add(group);
    stationMeshes.push(group);
  });
}

function addFrameBars(group, width, height, centerY) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x1d1a16, roughness: 0.6 });
  const thickness = 0.08;
  const z = 0.015;
  [
    [width, thickness, 0, centerY + height / 2],
    [width, thickness, 0, centerY - height / 2],
    [thickness, height, -width / 2, centerY],
    [thickness, height, width / 2, centerY],
  ].forEach(([w, h, x, y]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), mat);
    bar.position.set(x, y, z);
    group.add(bar);
  });
}

function addLayerModel(group) {
  const colors = [0xefd6c1, 0xd9a982, 0xb96d51];
  colors.forEach((color, i) => {
    const layer = new THREE.Mesh(
      new THREE.BoxGeometry(0.72 - i * 0.1, 0.08, 0.5 - i * 0.06),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
    );
    layer.position.set(-0.46 + i * 0.46, 0.1 + i * 0.16, -0.4);
    layer.rotation.y = -0.25;
    group.add(layer);
  });
}

function addObjectModel(group) {
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0xffd46b, roughness: 0.58 })
  );
  body.position.set(-0.42, 0.14, -0.42);
  body.scale.set(1, 1.15, 0.82);
  group.add(body);

  const card = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.52, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
  );
  card.position.set(0.42, 0.12, -0.42);
  card.rotation.y = -0.2;
  group.add(card);
}

function addArchiveModel(group) {
  const ring = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.24, 0.035, 92, 10),
    new THREE.MeshStandardMaterial({ color: 0x51766a, roughness: 0.36, metalness: 0.08 })
  );
  ring.position.set(-0.36, 0.15, -0.42);
  group.add(ring);

  const qr = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x171717 })
  );
  qr.position.set(0.38, 0.18, -0.42);
  qr.rotation.y = Math.PI;
  group.add(qr);
}

function addGuideLine() {
  const points = [new THREE.Vector3(0, 0.018, 6.2), ...stations.map((s) => new THREE.Vector3(s.position.x, 0.018, s.position.z))];
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 120, 0.018, 8, false);
  const material = new THREE.MeshBasicMaterial({ color: 0x8c3c24, transparent: true, opacity: 0.58 });
  scene.add(new THREE.Mesh(geometry, material));
}

function addTextPlane(text, position, width, height, color, background) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = text.length > 18 ? "700 56px Microsoft YaHei, sans-serif" : "800 74px Microsoft YaHei, sans-serif";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture }));
  mesh.position.copy(position);
  mesh.rotation.y = Math.PI;
  scene.add(mesh);
}

function addTextSprite(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(23,23,23,0.72)";
  roundRect(ctx, 12, 20, 488, 84, 18);
  ctx.fill();
  ctx.fillStyle = "#fffaf0";
  ctx.font = "800 42px Microsoft YaHei, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(1.75, 0.44, 1);
  return sprite;
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

function setupInput() {
  window.addEventListener("keydown", (event) => {
    state.keys.add(event.key.toLowerCase());
    if (event.key === "Escape") panel.classList.toggle("is-collapsed");
  });
  window.addEventListener("keyup", (event) => state.keys.delete(event.key.toLowerCase()));

  renderer.domElement.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
  });

  renderer.domElement.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    state.yaw -= dx * 0.003;
    state.pitch = THREE.MathUtils.clamp(state.pitch - dy * 0.0024, -0.55, 0.45);
    updateCameraRotation();
  });

  renderer.domElement.addEventListener("pointerup", (event) => {
    state.dragging = false;
    renderer.domElement.releasePointerCapture(event.pointerId);
    handleClick(event);
  });

  joystick.addEventListener("pointerdown", (event) => {
    state.mobile.pointerId = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    updateJoystick(event);
  });
  joystick.addEventListener("pointermove", (event) => {
    if (state.mobile.pointerId === event.pointerId) updateJoystick(event);
  });
  joystick.addEventListener("pointerup", (event) => {
    if (state.mobile.pointerId !== event.pointerId) return;
    state.mobile.pointerId = null;
    state.mobile.x = 0;
    state.mobile.y = 0;
    stick.style.transform = "translate(0, 0)";
  });
}

function setupUi() {
  audienceGrid.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => setAudience(button.dataset.audience));
  });
  panelClose.addEventListener("click", () => panel.classList.add("is-collapsed"));
  resetButton.addEventListener("click", resetTour);
  fullscreenButton.addEventListener("click", () => document.body.classList.toggle("tour-fullscreen-mode"));
  renderProgress();
}

function setAudience(audience) {
  state.audience = audience;
  state.completed.clear();
  state.activeStation = null;
  audienceGrid.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.audience === audience);
  });
  updatePanelIntro();
  flyTo(new THREE.Vector3(0, 1.58, 5.8), 0);
}

function resetTour() {
  state.audience = null;
  state.activeStation = null;
  state.completed.clear();
  state.yaw = 0;
  state.pitch = -0.04;
  camera.position.set(0, 1.58, 7.2);
  updateCameraRotation();
  audienceGrid.querySelectorAll("button").forEach((button) => button.classList.remove("is-selected"));
  updatePanelIntro();
}

function updatePanelIntro() {
  const audience = state.audience ? audiences[state.audience] : null;
  panel.classList.remove("is-collapsed");
  panelKicker.textContent = audience ? audience.label : "METRION Interactive Tour";
  panelTitle.textContent = audience ? "沿着四个站点，完成一次结构转译导览。" : "让一幅画，成为一个空间。";
  panelBody.textContent = audience
    ? audience.intro
    : "选择你的身份路径，导览会把元维构的结构转译、实体样本、数字档案和授权合作拆成四个可理解的站点。";
  audienceEl.textContent = audience ? audience.label : "访客路径";
  objectiveEl.textContent = audience ? stations[0].objective : "选择你的参观路径";
  stepCountEl.textContent = `任务 ${Math.min(state.completed.size + 1, stations.length)}/${stations.length}`;
  renderProgress();
  renderActions(false);
}

function openStation(stationId) {
  const station = stations.find((item) => item.id === stationId);
  if (!station) return;
  if (!state.audience) setAudience("family");

  state.activeStation = stationId;
  state.completed.add(stationId);
  panel.classList.remove("is-collapsed");
  panelKicker.textContent = station.kicker;
  panelTitle.textContent = station.title;
  panelBody.textContent = station.copy[state.audience] || station.copy.family;
  objectiveEl.textContent = nextObjective();
  stepCountEl.textContent = `任务 ${Math.min(state.completed.size + 1, stations.length)}/${stations.length}`;
  renderProgress();
  renderActions(state.completed.size >= 3);
}

function nextObjective() {
  const next = stations.find((station) => !state.completed.has(station.id));
  if (next) return next.objective;
  return "导览完成，选择一个合作入口继续";
}

function renderProgress() {
  progressEl.innerHTML = "";
  stations.forEach((station, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = [
      state.activeStation === station.id ? "is-active" : "",
      state.completed.has(station.id) ? "is-complete" : "",
    ].join(" ");
    button.innerHTML = `<span>${state.completed.has(station.id) ? "✓" : index + 1}</span><strong>${station.label}</strong>`;
    button.addEventListener("click", () => flyTo(station.position.clone().add(new THREE.Vector3(0, 0.1, 2.8)), station.position.x > 0 ? -0.38 : station.position.x < 0 ? 0.38 : 0));
    progressEl.appendChild(button);
  });
}

function renderActions(showFinal) {
  actionsEl.innerHTML = "";
  if (!state.audience) {
    actionsEl.append(makeAction("先做适配判断", "./artwork-fit.html?source=interactive-tour"));
    return;
  }
  if (showFinal || state.completed.size === stations.length) {
    audiences[state.audience].cta.forEach(([label, href]) => actionsEl.append(makeAction(label, href)));
    return;
  }
  const next = stations.find((station) => !state.completed.has(station.id));
  if (next) {
    const button = makeAction(`前往${next.label}站`, "#");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      flyTo(next.position.clone().add(new THREE.Vector3(0, 0.1, 2.8)), 0);
      panel.classList.add("is-collapsed");
    });
    actionsEl.append(button);
  }
}

function makeAction(label, href) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  return link;
}

function handleClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(stationMeshes, true);
  if (!hits.length) return;
  let target = hits[0].object;
  while (target && !target.userData.stationId) target = target.parent;
  if (target?.userData.stationId) openStation(target.userData.stationId);
}

function flyTo(position, yaw) {
  camera.position.copy(position);
  state.yaw = yaw;
  state.pitch = -0.04;
  updateCameraRotation();
}

function updateJoystick(event) {
  const rect = joystick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = THREE.MathUtils.clamp(event.clientX - cx, -38, 38);
  const dy = THREE.MathUtils.clamp(event.clientY - cy, -38, 38);
  state.mobile.x = dx / 38;
  state.mobile.y = dy / 38;
  stick.style.transform = `translate(${dx}px, ${dy}px)`;
}

function render() {
  const dt = Math.min(clock.getDelta(), 0.05);
  updateMovement(dt);
  updateStationFeedback();
  renderer.render(scene, camera);
}

function updateMovement(dt) {
  const speed = state.keys.has("shift") ? 5.2 : 3.2;
  const forward = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw) * -1);
  const right = new THREE.Vector3(Math.cos(state.yaw), 0, Math.sin(state.yaw));
  const move = new THREE.Vector3();

  if (state.keys.has("w") || state.keys.has("arrowup")) move.add(forward);
  if (state.keys.has("s") || state.keys.has("arrowdown")) move.sub(forward);
  if (state.keys.has("a") || state.keys.has("arrowleft")) move.sub(right);
  if (state.keys.has("d") || state.keys.has("arrowright")) move.add(right);
  move.addScaledVector(forward, -state.mobile.y);
  move.addScaledVector(right, state.mobile.x);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * dt);
    camera.position.add(move);
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -5.9, 5.9);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -18.6, 6.7);
  }
}

function updateStationFeedback() {
  let nearest = null;
  let nearestDistance = Infinity;
  stationMeshes.forEach((group, index) => {
    const distance = camera.position.distanceTo(group.position);
    const marker = group.children.find((child) => child.geometry?.type === "TorusGeometry");
    if (marker) {
      marker.material.color.set(state.completed.has(stations[index].id) ? 0x171717 : 0x8c3c24);
      marker.scale.setScalar(distance < 3.4 ? 1.16 : 1);
      marker.rotation.z += 0.012;
    }
    if (distance < nearestDistance) {
      nearest = stations[index];
      nearestDistance = distance;
    }
  });
  promptEl.classList.toggle("is-visible", nearestDistance < 3.7);
  if (nearestDistance < 3.7) {
    promptEl.querySelector("span").textContent = `点击查看：${nearest.label}`;
  }
}

function updateCameraRotation() {
  camera.rotation.order = "YXZ";
  camera.rotation.y = state.yaw;
  camera.rotation.x = state.pitch;
}

function onResize() {
  const width = mount.clientWidth || window.innerWidth;
  const height = mount.clientHeight || window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
