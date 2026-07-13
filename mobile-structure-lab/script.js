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
const layerDepth = document.querySelector("#layerDepth");
const layerName = document.querySelector("#layerName");
const layerTitle = document.querySelector("#layerTitle");
const spaceStage = document.querySelector("#spaceStage");
const spaceLayers = [...document.querySelectorAll(".space-layer")];
const depthStops = [...document.querySelectorAll(".depth-axis span")];
const modelStage = document.querySelector("#modelStage");
const modelViewer = document.querySelector(".glb-viewer");
const modelLoadTitle = document.querySelector("#modelLoadTitle");
const modelLoadDetail = document.querySelector("#modelLoadDetail");
const modelFallbackText = document.querySelector("#modelFallbackText");
const modelRetry = document.querySelector("#modelRetry");
const packPreview = document.querySelector("#packPreview");
const packLabel = document.querySelector("#packLabel");
const packTabs = [...document.querySelectorAll(".pack-tab")];

const selected = new Set();
const confirmedSpaces = new Set();
let phase = 0;
let activeLayer = null;
let packRequest = 0;
let modelState = "idle";
let modelLoadTimeout = null;

const layerOrder = ["trees", "house", "water"];

const layers = {
  trees: {
    key: "树群背景",
    name: "树群",
    depth: "后景",
    title: "后景围合层：把浓密树墙转成可站立的浮雕背景",
    src: "./assets/klimt/layer-trees-mobile.jpg",
    alt: "树群背景转译层",
    x: 0.73,
    y: 0.23,
  },
  house: {
    key: "房屋主体",
    name: "房屋",
    depth: "中景",
    title: "主体结构层：保留白墙、深屋顶和侧向平台关系",
    src: "./assets/klimt/layer-house-mobile.jpg",
    alt: "房屋主体转译层",
    x: 0.53,
    y: 0.44,
  },
  water: {
    key: "湖面承托",
    name: "湖面",
    depth: "前景",
    title: "前景基座层：把水面反光转成低矮承托平台",
    src: "./assets/klimt/layer-water-mobile.jpg",
    alt: "湖面承托转译层",
    x: 0.3,
    y: 0.82,
  },
};

const packs = {
  premium: {
    label: "高级硬盒",
    src: "./assets/klimt/pack-premium-box-mobile.jpg",
    alt: "Klimt 转译作品高级硬盒包装",
  },
  header: {
    label: "挂袋包装",
    src: "./assets/klimt/pack-header-bag-mobile.jpg",
    alt: "Klimt 转译作品挂袋包装",
  },
  paper: {
    label: "纸盒贴纸",
    src: "./assets/klimt/pack-paper-box-mobile.jpg",
    alt: "Klimt 转译作品纸盒贴纸包装",
  },
  blister: {
    label: "吸塑卡",
    src: "./assets/klimt/pack-blister-card-mobile.jpg",
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
  layerDepth.textContent = layer.depth;
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
    const remaining = layerOrder.filter((key) => !selected.has(key)).map((key) => layers[key].name);
    primaryAction.disabled = selected.size < 3;
    primaryAction.textContent = selected.size < 3 ? `已发现 ${selected.size}/3 层` : "进入空间拆解";
    statusTitle.textContent = selected.size < 3 ? `待发现：${remaining.join("、")}` : "三层结构已从原画中提取";
  }

  if (phase === 1) {
    primaryAction.disabled = confirmedSpaces.size < 3;
    primaryAction.textContent = confirmedSpaces.size < 3 ? `已归位 ${confirmedSpaces.size}/3 层` : "打开三维模型";
    statusTitle.textContent = confirmedSpaces.size < 3 ? "依次确认后景、中景、前景" : "空间深度已经建立";
  }

  if (phase > 1) {
    primaryAction.disabled = false;
  }

  if (phase === 2) updateModelStatus();

  points.forEach((point) => {
    const layerId = point.dataset.layer;
    point.classList.toggle("selected", selected.has(layerId));
    point.setAttribute("aria-pressed", String(selected.has(layerId)));
  });

  outlines.forEach((outline) => {
    const layerId = outline.dataset.layer;
    outline.classList.toggle("selected", selected.has(layerId));
    outline.classList.toggle("active", activeLayer === layerId);
  });

  spaceLayers.forEach((item) => {
    const layerId = item.dataset.layer;
    item.classList.toggle("selected", confirmedSpaces.has(layerId));
    item.setAttribute("aria-pressed", String(confirmedSpaces.has(layerId)));
  });

  depthStops.forEach((stop, index) => {
    stop.classList.toggle("done", confirmedSpaces.has(layerOrder[index]));
  });

  artworkCard.classList.toggle("has-active", phase === 0 && Boolean(activeLayer));
  spaceStage.dataset.active = activeLayer || "";

  steps.forEach((step, index) => {
    step.classList.toggle("active", index === phase);
    step.classList.toggle("done", index < phase);
  });

  if (activeLayer) updateLayerPanel(activeLayer);
  if (!activeLayer) layerPanel.classList.remove("visible");
  restartAction.hidden = phase !== 3;

  if (phase >= 1) ensureModelLoaded();
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
  activeLayer = selected.has(layerId) ? layerId : [...selected].at(-1) || null;
  render();
}

function keyFromArtworkPosition(event) {
  const rect = artworkCard.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  if (y > 0.68) return "water";
  if (x > 0.28 && x < 0.78 && y > 0.3 && y < 0.66) return "house";
  if (y < 0.72) return "trees";
  return null;
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
    activeLayer = confirmedSpaces.has(layerId) ? layerId : [...confirmedSpaces].at(-1) || null;
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

const packCache = new Map();

function warmImage(src) {
  if (packCache.has(src)) return packCache.get(src);
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  packCache.set(src, image);
  return image;
}

function preloadPacks() {
  Object.values(packs).forEach((pack) => {
    const image = warmImage(pack.src);
    if (image.decode) image.decode().catch(() => {});
  });
}

async function selectPack(tab) {
  const pack = packs[tab.dataset.pack];
  if (!pack) return;
  const request = ++packRequest;
  const cached = warmImage(pack.src);
  packPreview.classList.add("switching");

  if (!cached.complete) {
    await new Promise((resolve) => {
      cached.addEventListener("load", resolve, { once: true });
      cached.addEventListener("error", resolve, { once: true });
    });
  }
  if (request !== packRequest) return;

  packPreview.src = pack.src;
  packPreview.alt = pack.alt;
  packLabel.textContent = pack.label;
  packTabs.forEach((item) => item.classList.toggle("active", item === tab));
  requestAnimationFrame(() => packPreview.classList.remove("switching"));
}

packTabs.forEach((tab) => {
  tab.addEventListener("click", () => selectPack(tab));
});

function updateModelStatus() {
  if (phase !== 2) return;
  if (modelState === "loading") {
    statusTitle.textContent = "三维模型正在打开";
  } else if (modelState === "ready") {
    statusTitle.textContent = "拖动查看空间关系";
  } else if (modelState === "failed") {
    statusTitle.textContent = "已切换为实体预览";
  }
}

function clearModelLoadTimeout() {
  if (!modelLoadTimeout) return;
  window.clearTimeout(modelLoadTimeout);
  modelLoadTimeout = null;
}

function setModelLoading() {
  modelState = "loading";
  modelStage.classList.remove("model-ready", "model-failed");
  modelStage.classList.add("model-loading");
  modelStage.style.setProperty("--model-progress", "8%");
  modelLoadTitle.textContent = "正在准备三维模型";
  modelLoadDetail.textContent = "轻量模型载入中";
  updateModelStatus();
}

function setModelReady() {
  clearModelLoadTimeout();
  modelState = "ready";
  modelStage.classList.remove("model-loading", "model-failed");
  modelStage.classList.add("model-ready");
  modelStage.style.setProperty("--model-progress", "100%");
  updateModelStatus();
}

function setModelFailed(message = "三维视图暂时未能载入") {
  clearModelLoadTimeout();
  modelState = "failed";
  modelStage.classList.remove("model-loading", "model-ready");
  modelStage.classList.add("model-failed");
  modelFallbackText.textContent = message;
  updateModelStatus();
}

function waitForModelViewer() {
  if (window.customElements?.get("model-viewer")) return Promise.resolve();
  if (!window.customElements) return Promise.reject(new Error("Custom elements unavailable"));

  return Promise.race([
    window.customElements.whenDefined("model-viewer"),
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("Model viewer unavailable")), 5000);
    }),
  ]);
}

async function ensureModelLoaded(force = false) {
  if (!modelViewer || modelState === "ready") return;
  if (modelState === "loading" && !force) return;

  clearModelLoadTimeout();
  setModelLoading();

  try {
    await waitForModelViewer();
    const source = modelViewer.dataset.src;
    if (!source) throw new Error("Model source unavailable");

    if (force) modelViewer.removeAttribute("src");
    if (force || !modelViewer.getAttribute("src")) modelViewer.setAttribute("src", source);

    if (modelViewer.loaded) {
      setModelReady();
      return;
    }

    modelLoadTimeout = window.setTimeout(() => {
      setModelFailed("载入时间较长，请重试三维模型");
    }, 15000);
  } catch (error) {
    setModelFailed("当前浏览器未能启动三维视图");
  }
}

if (modelViewer) {
  modelViewer.addEventListener("error", () => {
    setModelFailed("模型载入失败，请重试");
  });
  modelViewer.addEventListener("load", () => {
    setModelReady();
  });
  modelViewer.addEventListener("progress", (event) => {
    const progress = Math.max(0.08, Math.min(1, event.detail?.totalProgress || 0));
    modelStage.style.setProperty("--model-progress", `${Math.round(progress * 100)}%`);
    modelLoadDetail.textContent = progress < 0.9 ? `模型载入 ${Math.round(progress * 100)}%` : "正在准备材质";
  });
}

modelRetry?.addEventListener("click", () => {
  ensureModelLoaded(true);
});

if ("requestIdleCallback" in window) {
  window.requestIdleCallback(preloadPacks, { timeout: 1400 });
} else {
  window.setTimeout(preloadPacks, 600);
}

render();
