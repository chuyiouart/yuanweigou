const mobileFlow = document.querySelector("[data-mobile-flow]");
const mobileFlowTrack = document.querySelector("[data-mobile-flow-track]");
const mobileStageNumber = document.querySelector("[data-mobile-stage-number]");
const mobileStageNote = document.querySelector("[data-mobile-stage-note]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const mobileStageCopy = {
  original: {
    number: "01 / ORIGINAL",
    note: "保留作品图像、尺寸、来源与语境，作为所有结构判断和授权记录的起点。",
  },
  structure: {
    number: "02 / STRUCTURE",
    note: "把主体、前景、背景与装饰关系拆开，确认哪些视觉信息适合进入空间。",
  },
  model: {
    number: "03 / MODEL",
    note: "将结构关系转换为可制作、可调整、可继续验证的三维模型。",
  },
  physical: {
    number: "04 / PHYSICAL",
    note: "根据用途生成实体样本、收藏版本或展厅展示，并记录实际制作状态。",
  },
  archive: {
    number: "05 / ARCHIVE",
    note: "把原作、模型、展示文件与授权边界整理为可追溯、可继续使用的数字档案。",
  },
};

function selectMobileStage(stage, shouldCenter = true) {
  const copy = mobileStageCopy[stage];
  if (!copy || !mobileFlow) return;

  const controls = [...mobileFlow.querySelectorAll("[data-mobile-stage]")];
  const active = controls.find((control) => control.dataset.mobileStage === stage);

  controls.forEach((control) => {
    const selected = control === active;
    control.classList.toggle("is-active", selected);
    control.setAttribute("aria-pressed", String(selected));
  });

  mobileStageNumber.textContent = copy.number;
  mobileStageNote.textContent = copy.note;

  if (shouldCenter && active && mobileFlowTrack) {
    mobileFlowTrack.scrollTo({
      left: active.offsetLeft - (mobileFlowTrack.clientWidth - active.clientWidth) / 2,
      behavior: reduceMotion.matches ? "auto" : "smooth",
    });
  }
}

mobileFlow?.addEventListener("click", (event) => {
  const control = event.target.closest("[data-mobile-stage]");
  if (control) selectMobileStage(control.dataset.mobileStage);
});

selectMobileStage("original", false);

window.addEventListener("load", () => {
  if (!window.location.hash) return;
  const target = document.querySelector(window.location.hash);
  if (!target) return;
  window.setTimeout(() => target.scrollIntoView({ behavior: "auto", block: "start" }), 80);
});

const dockLinks = [...document.querySelectorAll("[data-mobile-dock]")];
const observedSections = [
  ["top", document.querySelector(".mobile-hero")],
  ["interactive-works", document.querySelector("#interactive-works")],
];

function setCurrentDock(id) {
  dockLinks.forEach((link) => link.classList.toggle("is-current", link.dataset.mobileDock === id));
}

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const match = observedSections.find(([, section]) => section === visible?.target);
      if (match) setCurrentDock(match[0]);
    },
    { threshold: [0.05, 0.2], rootMargin: "-10% 0px -30%" },
  );

  observedSections.forEach(([, section]) => {
    if (section) sectionObserver.observe(section);
  });
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    const basePath = location.hostname.endsWith("github.io") ? "/yuanweigou/" : "/";
    navigator.serviceWorker
      .register(`${basePath}sw.js?v=20260711-mobile-v3`)
      .then((registration) => registration.update().catch(() => {}))
      .catch(() => {});
  });
}
