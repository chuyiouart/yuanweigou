const HOME_URL = "https://chuyiouart.github.io/yuanweigou/";

const app = document.querySelector(".app-screen");
const points = [...document.querySelectorAll(".structure-point")];
const outlines = [...document.querySelectorAll(".layer-outline")];
const steps = [...document.querySelectorAll(".step")];
const statusKicker = document.querySelector("#statusKicker");
const statusTitle = document.querySelector("#statusTitle");
const statusCount = document.querySelector("#statusCount");
const primaryAction = document.querySelector("#primaryAction");
const secondaryAction = document.querySelector("#secondaryAction");
const restartAction = document.querySelector("#restartAction");
const resetTop = document.querySelector("#resetTop");
const artworkCard = document.querySelector("#artworkCard");
const layerPanel = document.querySelector("#layerPanel");
const layerPreview = document.querySelector("#layerPreview");
const layerName = document.querySelector("#layerName");
const layerTitle = document.querySelector("#layerTitle");
const spaceLayers = [...document.querySelectorAll(".space-layer")];
const modelStage = document.querySelector("#modelStage");
const modelViewer = document.querySelector(".glb-viewer");
const packPreview = document.querySelector("#packPreview");
const packLabel = document.querySelector("#packLabel");
const packTabs = [...document.querySelectorAll(".pack-tab")];

const selected = new Set();
const confirmedSpaces = new Set();
let phase = 0;
let activeLayer = null;

const layers = {
  trees: {
    key: "树群背景",
    name: "树群",
    title: "后景围合层：把浓密树墙转成可站立的浮雕背景",
    src: "./assets/klimt/layer-trees-generated.png",
    alt: "树群背景转译层",
    x: 0.73,
    y: 0.23,
  },
  house: {
    key: "房屋主体",
    name: "房屋",
    title: "主体结构层：保留白墙、深屋顶和侧向平台关系",
    src: "./assets/klimt/layer-house-generated.png",
    alt: "房屋主体转译层",
    x: 0.53,
    y: 0.44,
  },
  water: {
    key: "湖面承托",
    name: "湖面",
    title: "前景基座层：把水面反光转成低矮承托平台",
    src: "./assets/klimt/layer-water-generated.png",
    alt: "湖面承托转译层",
    x: 0.3,
    y: 0.82,
  },
};

const packs = {
  premium: {
    label: "高级硬盒",
    src: "./assets/klimt/pack-premium-box.png",
    alt: "Klimt 转译作品高级硬盒包装",
  },
  header: {
    label: "挂袋包装",
    src: "./assets/klimt/pack-header-bag.png",
    alt: "Klimt 转译作品挂袋包装",
  },
  paper: {
    label: "纸盒贴纸",
    src: "./assets/klimt/pack-paper-box.png",
    alt: "Klimt 转译作品纸盒贴纸包装",
  },
  blister: {
    label: "吸塑卡",
    src: "./assets/klimt/pack-blister-card.png",
    alt: "Klimt 转译作品吸塑卡包装",
  },
};

const phaseCopy = [
  {
    phase: "select",
    kicker: "选结构",
    title: "点击树群、房屋、湖面",
    action: "继续选择结构点",
    count: () => `${selected.size}/3`,
  },
  {
    phase: "layers",
    kicker: "拆空间",
    title: "点选 3 个空间层",
    action: "点选空间层",
    count: () => `${confirmedSpaces.size}/3`,
  },
  {
    phase: "model",
    kicker: "模型",
    title: "拖动查看空间关系",
    action: "查看档案卡",
    count: () => "3/4",
  },
  {
    phase: "archive",
    kicker: "档案",
    title: "查看档案与完整包装",
    action: "提交作品判断",
    count: () => "4/4",
  },
];

function updateLayerPanel(layerId) {
  const layer = layers[layerId];
  if (!layer) {
    layerPanel.classList.remove("visible");
    return;
  }
  layerPreview.src = layer.src;
  layerPreview.alt = layer.alt;
  layerName.textContent = layer.name;
  layerTitle.textContent = layer.title;
  layerPanel.classList.add("visible");
}

function render() {
  const copy = phaseCopy[phase];
  app.dataset.phase = copy.phase;
  statusKicker.textContent = copy.kicker;
  statusTitle.textContent = copy.title;
  statusCount.textContent = copy.count();
  primaryAction.textContent = copy.action;

  if (phase === 0) {
    primaryAction.textContent = selected.size < 3 ? "继续选择结构点" : "进入空间拆解";
    statusTitle.textContent = selected.size < 3 ? "点击树群、房屋、湖面" : "结构层已提取";
  }

  if (phase === 1) {
    primaryAction.textContent = confirmedSpaces.size < 3 ? "点选空间层" : "打开三维模型";
    statusTitle.textContent = confirmedSpaces.size < 3 ? "点选 3 个空间层" : "空间层已确认";
  }

  points.forEach((point) => {
    const layerId = point.dataset.layer;
    point.classList.toggle("selected", selected.has(layerId));
  });

  outlines.forEach((outline) => {
    const layerId = outline.dataset.layer;
    outline.classList.toggle("selected", selected.has(layerId));
    outline.classList.toggle("active", activeLayer === layerId);
  });

  spaceLayers.forEach((item) => {
    const layerId = item.dataset.layer;
    item.classList.toggle("selected", confirmedSpaces.has(layerId));
  });

  steps.forEach((step, index) => {
    step.classList.toggle("active", index === phase);
    step.classList.toggle("done", index < phase);
  });

  if (activeLayer) updateLayerPanel(activeLayer);
  restartAction.hidden = phase !== 3;
}

function nudgeStatus() {
  statusTitle.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-5px)" },
      { transform: "translateX(5px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 190, easing: "ease-out" },
  );
}

function advance() {
  if (phase === 0) {
    if (selected.size < 3) {
      nudgeStatus();
      return;
    }
    phase = 1;
  } else if (phase === 1) {
    if (confirmedSpaces.size < 3) {
      nudgeStatus();
      return;
    }
    phase = 2;
  } else if (phase < 3) {
    phase += 1;
  } else {
    window.location.href = HOME_URL;
    return;
  }
  render();
}

function reset() {
  selected.clear();
  confirmedSpaces.clear();
  activeLayer = null;
  phase = 0;
  render();
}

function togglePoint(layerId) {
  if (phase !== 0 || !layers[layerId]) return;
  if (selected.has(layerId)) {
    selected.delete(layerId);
  } else {
    selected.add(layerId);
  }
  activeLayer = layerId;
  render();
}

function keyFromArtworkPosition(event) {
  const rect = artworkCard.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  let best = "trees";
  let bestDistance = Number.POSITIVE_INFINITY;
  Object.entries(layers).forEach(([layerId, layer]) => {
    const distance = Math.hypot(x - layer.x, y - layer.y);
    if (distance < bestDistance) {
      best = layerId;
      bestDistance = distance;
    }
  });

  return bestDistance < 0.22 ? best : null;
}

points.forEach((point) => {
  point.addEventListener("pointerup", (event) => {
    event.preventDefault();
    event.stopPropagation();
    togglePoint(point.dataset.layer);
  });
});

artworkCard.addEventListener("pointerup", (event) => {
  if (event.target.closest(".structure-point")) return;
  const layerId = keyFromArtworkPosition(event);
  if (layerId) togglePoint(layerId);
});

spaceLayers.forEach((item) => {
  item.addEventListener("click", () => {
    const layerId = item.dataset.layer;
    if (!layers[layerId]) return;
    if (confirmedSpaces.has(layerId)) {
      confirmedSpaces.delete(layerId);
    } else {
      confirmedSpaces.add(layerId);
    }
    activeLayer = layerId;
    render();
  });
});

steps.forEach((step) => {
  step.addEventListener("click", () => {
    const target = Number(step.dataset.step);
    if (target === 0) {
      phase = 0;
    } else if (target === 1 && selected.size === 3) {
      phase = 1;
    } else if (target === 2 && selected.size === 3 && confirmedSpaces.size === 3) {
      phase = 2;
    } else if (target === 3 && phase >= 2) {
      phase = 3;
    } else {
      nudgeStatus();
      return;
    }
    render();
  });
});

primaryAction.addEventListener("click", advance);
secondaryAction.addEventListener("click", () => {
  window.location.href = HOME_URL;
});
restartAction.addEventListener("click", reset);
resetTop.addEventListener("click", reset);

packTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const pack = packs[tab.dataset.pack];
    if (!pack) return;
    packPreview.src = pack.src;
    packPreview.alt = pack.alt;
    packLabel.textContent = pack.label;
    packTabs.forEach((item) => item.classList.toggle("active", item === tab));
  });
});

if (modelViewer) {
  modelViewer.addEventListener("error", () => {
    modelStage.classList.add("model-failed");
  });
  modelViewer.addEventListener("load", () => {
    modelStage.classList.remove("model-failed");
  });
}

render();
