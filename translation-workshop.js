const samples = {
  youth: {
    image: "./assets/workshop-art-youth-v2.jpg",
    label: "儿童 / 青少年作品",
    result: {
      keepsake: "这件作品适合从纪念样本开始：保留角色、色彩和故事感，配合包装与展示卡，形成家庭可保存的立体作品。",
      edition: "这件作品可以作为青少年创作案例，但收藏版和公开销售需要监护人与机构授权单独确认。",
      exhibition: "这件作品适合进入课程成果展：原作、过程、成品和二维码档案可以形成完整展示闭环。",
    },
  },
  artist: {
    image: "./assets/workshop-art-artist-v2.jpg",
    label: "艺术家作品",
    result: {
      keepsake: "这件作品可以先做一件小尺寸结构样本，用于判断材质、尺寸和展览陈列效果。",
      edition: "这件作品适合进入收藏版路径：编号、证书、涂装版本和授权分成可以作为后续商业化基础。",
      exhibition: "这件作品适合做数字档案和网页展示，但公开传播和衍生品销售需要与权利方确认边界。",
    },
  },
  institution: {
    image: "./assets/workshop-art-institution-v2.jpg",
    label: "机构样本",
    result: {
      keepsake: "机构样本可以转化为活动礼赠，但需要先确认作品来源、数量、预算和公开范围。",
      edition: "机构样本不建议直接进入收藏版销售，除非作者授权、编号规则和收益分配已经清楚。",
      exhibition: "这条路径最适合机构：用统一字段、展签二维码和网页 3D 形成可维护的成果展模板。",
    },
  },
};

const outputs = {
  keepsake: {
    title: "已生成纪念样本建议",
    actions: [
      ["提交作品判断", "./submit-check.html?source=translation-workshop&output=keepsake"],
      ["查看教育合作", "./education.html?source=translation-workshop&output=keepsake"],
    ],
  },
  edition: {
    title: "已生成收藏版建议",
    actions: [
      ["了解授权模式", "./licensing.html?source=translation-workshop&output=edition"],
      ["提交第一件样本", "./submit-check.html?source=translation-workshop&output=edition"],
    ],
  },
  exhibition: {
    title: "已生成展厅档案建议",
    actions: [
      ["查看数字档案", "./spatial-archive.html?source=translation-workshop&output=exhibition"],
      ["查看虚拟展厅", "./virtual-gallery.html?source=translation-workshop&output=exhibition"],
    ],
  },
};

const state = {
  sample: "youth",
  checks: new Set(),
  layers: new Set(),
  output: null,
  dragged: null,
};

const stepEl = document.getElementById("workshopStep");
const objectiveEl = document.getElementById("workshopObjective");
const sourceImage = document.getElementById("sourceImage");
const phaseKicker = document.getElementById("phaseKicker");
const phaseTitle = document.getElementById("phaseTitle");
const phaseText = document.getElementById("phaseText");
const checkGrid = document.getElementById("checkGrid");
const layerGame = document.getElementById("layerGame");
const outputGrid = document.getElementById("outputGrid");
const resultCard = document.getElementById("resultCard");
const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const resultActions = document.getElementById("resultActions");
const sampleObject = document.getElementById("sampleObject");
const translationPreview = document.getElementById("translationPreview");
const celebrationLayer = document.getElementById("celebrationLayer");
let audioContext;

document.querySelectorAll(".sample-card").forEach((card) => {
  card.addEventListener("click", () => {
    playTone("select");
    chooseSample(card.dataset.sample);
  });
});

document.querySelectorAll("[data-check]").forEach((button) => {
  button.addEventListener("click", () => {
    playTone("tap");
    state.checks.add(button.dataset.check);
    button.classList.add("is-complete");
    if (state.checks.size === 3) showLayerPhase();
    updateHud();
  });
});

document.querySelectorAll(".piece").forEach((piece) => {
  piece.addEventListener("dragstart", (event) => {
    state.dragged = piece.dataset.piece;
    event.dataTransfer.setData("text/plain", state.dragged);
  });
  piece.addEventListener("click", () => fillNextMatchingSlot(piece.dataset.piece));
});

document.querySelectorAll(".slot").forEach((slot) => {
  slot.addEventListener("dragover", (event) => {
    event.preventDefault();
    slot.classList.add("is-hover");
  });
  slot.addEventListener("dragleave", () => slot.classList.remove("is-hover"));
  slot.addEventListener("drop", (event) => {
    event.preventDefault();
    slot.classList.remove("is-hover");
    fillSlot(slot, event.dataTransfer.getData("text/plain") || state.dragged);
  });
  slot.addEventListener("click", () => fillSlot(slot, slot.dataset.accept));
});

document.querySelectorAll("[data-output]").forEach((button) => {
  button.addEventListener("click", () => {
    chooseOutput(button.dataset.output);
  });
});

document.getElementById("resetWorkshop").addEventListener("click", () => {
  playTone("tap");
  resetWorkshop();
});

function chooseSample(sample) {
  state.sample = sample;
  state.checks.clear();
  state.layers.clear();
  state.output = null;
  sourceImage.src = samples[sample].image;
  sourceImage.alt = samples[sample].label;
  translationPreview.dataset.sample = sample;
  restartAnimation(sourceImage, "is-swapping");
  document.querySelectorAll(".sample-card").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.sample === sample);
  });
  resetPhaseUi();
  updateHud();
}

function showLayerPhase() {
  checkGrid.classList.add("is-hidden");
  layerGame.classList.remove("is-hidden");
  phaseKicker.textContent = "Step 02";
  phaseTitle.textContent = "把画面拆成空间层。";
  phaseText.textContent = "拖动或点击三个结构层，把原作拆成背景、主体和装饰。这个动作对应真实项目里的结构判断与建模准备。";
}

function fillNextMatchingSlot(piece) {
  const slot = document.querySelector(`.slot[data-accept="${piece}"]`);
  if (slot) fillSlot(slot, piece);
}

function fillSlot(slot, piece) {
  if (slot.dataset.accept !== piece) {
    playTone("miss");
    slot.textContent = "这一层不适合放这里";
    setTimeout(() => {
      if (!slot.classList.contains("is-filled")) slot.textContent = `放入${slotLabel(slot.dataset.accept)}`;
    }, 700);
    return;
  }
  state.layers.add(piece);
  playTone("land");
  slot.classList.add("is-filled");
  slot.textContent = `${slotLabel(piece)}已就位`;
  document.querySelector(`[data-slot="${piece}"]`)?.classList.add("is-on");
  flashPreview();
  if (state.layers.size === 3) showOutputPhase();
  updateHud();
}

function showOutputPhase() {
  outputGrid.classList.remove("is-hidden");
  phaseKicker.textContent = "Step 03";
  phaseTitle.textContent = "选择这件作品的输出形态。";
  phaseText.textContent = "同一件转译资产可以进入不同业务路径。选择一个最接近当前客户需求的结果。";
}

function chooseOutput(output) {
  state.output = output;
  playSuccessFanfare();
  document.querySelectorAll("[data-output]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.output === output);
  });
  sampleObject.dataset.output = output;
  sampleObject.dataset.label = {
    keepsake: "纪念样本",
    edition: "收藏版",
    exhibition: "展厅档案",
  }[output];
  translationPreview.dataset.sample = state.sample;
  restartAnimation(sampleObject, "is-on");
  sampleObject.classList.add("is-on");
  flashPreview();
  burstConfetti(output);
  resultCard.classList.remove("is-hidden");
  resultTitle.textContent = outputs[output].title;
  resultText.textContent = samples[state.sample].result[output];
  resultActions.innerHTML = "";
  outputs[output].actions.forEach(([label, href]) => {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    resultActions.appendChild(link);
  });
  phaseKicker.textContent = "Step 04";
  phaseTitle.textContent = "结构转译样本已生成。";
  phaseText.textContent = "这不是最终报价，而是一条合作路径建议。真实项目还需要确认作品权属、尺寸、数量、材料和公开范围。";
  updateHud();
}

function flashPreview() {
  restartAnimation(translationPreview, "is-flashing");
}

function restartAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function playTone(type) {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  audioContext ||= new AudioCtor();
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const settings = {
    select: [420, 0.055, "triangle", 0.035],
    tap: [520, 0.045, "sine", 0.026],
    land: [360, 0.075, "triangle", 0.04],
    success: [620, 0.12, "sine", 0.045],
    miss: [160, 0.06, "sawtooth", 0.02],
  }[type] || [440, 0.05, "sine", 0.02];
  oscillator.type = settings[2];
  oscillator.frequency.setValueAtTime(settings[0], now);
  if (type === "success") oscillator.frequency.exponentialRampToValueAtTime(860, now + settings[1]);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(settings[3], now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + settings[1]);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + settings[1] + 0.02);
}

function playSuccessFanfare() {
  playTone("success");
  setTimeout(() => playTone("land"), 90);
  setTimeout(() => playTone("success"), 170);
}

function burstConfetti(output) {
  celebrationLayer.innerHTML = "";
  const palettes = {
    keepsake: ["#2bb7b3", "#ffcf70", "#f06f4f", "#8fd1a8", "#fffaf0"],
    edition: ["#1f365f", "#87a878", "#d69a87", "#f0c76d", "#fffaf0"],
    exhibition: ["#61b7d8", "#ef7f5f", "#e0b64b", "#6aa36f", "#fffaf0"],
  };
  const colors = palettes[output] || palettes.keepsake;
  for (let i = 0; i < 34; i += 1) {
    const piece = document.createElement("span");
    const angle = (Math.PI * 2 * i) / 34 + Math.random() * 0.45;
    const distance = 130 + Math.random() * 210;
    piece.className = "confetti-piece";
    piece.style.setProperty("--x", `${43 + Math.random() * 18}%`);
    piece.style.setProperty("--y", `${45 + Math.random() * 16}%`);
    piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--dy", `${Math.sin(angle) * distance + 90}px`);
    piece.style.setProperty("--r", `${Math.random() * 520 - 260}deg`);
    piece.style.setProperty("--w", `${6 + Math.random() * 8}px`);
    piece.style.setProperty("--h", `${10 + Math.random() * 14}px`);
    piece.style.setProperty("--c", colors[i % colors.length]);
    piece.style.animationDelay = `${Math.random() * 80}ms`;
    celebrationLayer.appendChild(piece);
  }
  window.setTimeout(() => {
    celebrationLayer.innerHTML = "";
  }, 1200);
}

function resetWorkshop() {
  state.checks.clear();
  state.layers.clear();
  state.output = null;
  resetPhaseUi();
  updateHud();
}

function resetPhaseUi() {
  phaseKicker.textContent = "Step 01";
  phaseTitle.textContent = "这件作品适合转译吗？";
  phaseText.textContent = "先做三个结构判断。元维构不是直接把图片变模型，而是先判断主体、层次和使用边界。";
  checkGrid.classList.remove("is-hidden");
  layerGame.classList.add("is-hidden");
  outputGrid.classList.add("is-hidden");
  resultCard.classList.add("is-hidden");
  sampleObject.classList.remove("is-on");
  sampleObject.removeAttribute("data-output");
  sampleObject.dataset.label = "完成样本";
  celebrationLayer.innerHTML = "";
  document.querySelectorAll("[data-check]").forEach((button) => button.classList.remove("is-complete"));
  document.querySelectorAll(".slot").forEach((slot) => {
    slot.classList.remove("is-filled", "is-hover");
    slot.textContent = `放入${slotLabel(slot.dataset.accept)}`;
  });
  document.querySelectorAll(".assembled-layer").forEach((layer) => layer.classList.remove("is-on"));
  document.querySelectorAll("[data-output]").forEach((button) => button.classList.remove("is-selected"));
}

function updateHud() {
  if (state.output) {
    stepEl.textContent = "步骤 4/4";
    objectiveEl.textContent = "选择一个入口，继续提交作品或查看服务";
    return;
  }
  if (state.layers.size === 3) {
    stepEl.textContent = "步骤 3/4";
    objectiveEl.textContent = "选择输出形态：纪念样本、收藏版或展厅档案";
    return;
  }
  if (state.checks.size === 3) {
    stepEl.textContent = "步骤 2/4";
    objectiveEl.textContent = "拖动三层结构，把画面拆成空间关系";
    return;
  }
  stepEl.textContent = "步骤 1/4";
  objectiveEl.textContent = `为「${samples[state.sample].label}」完成三个适配判断`;
}

function slotLabel(piece) {
  return {
    background: "背景层",
    subject: "主体层",
    detail: "装饰层",
  }[piece];
}

updateHud();
