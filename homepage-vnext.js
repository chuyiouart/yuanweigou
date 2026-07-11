const nav = document.querySelector("[data-site-nav]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const primaryNav = document.querySelector("[data-primary-nav]");
const heroVideo = document.querySelector("[data-hero-video]");
const motionToggle = document.querySelector("[data-motion-toggle]");
const flow = document.querySelector("[data-asset-flow]");
const flowNote = document.querySelector("[data-flow-note]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const flowNotes = {
  original: "保留作品的图像、尺寸、来源与语境，作为后续所有判断的起点。",
  structure: "把前景、主体、背景与装饰关系拆开，确认哪些信息适合进入空间。",
  model: "将结构关系转换为可制作、可调整、可继续验证的三维模型。",
  physical: "根据用途形成实体样本、收藏版或展厅展示，并同步记录制作状态。",
  archive: "把原作信息、展示文件、授权状态与使用边界沉淀为可追溯档案。",
};

function setMenu(open) {
  if (!menuToggle || !primaryNav) return;
  menuToggle.setAttribute("aria-expanded", String(open));
  primaryNav.classList.toggle("is-open", open);
}

menuToggle?.addEventListener("click", () => {
  setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
});

primaryNav?.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});

window.addEventListener(
  "scroll",
  () => {
    nav?.classList.toggle("is-scrolled", window.scrollY > 20);
  },
  { passive: true },
);

function setMotionPaused(paused) {
  if (!heroVideo || !motionToggle) return;

  if (paused) {
    heroVideo.pause();
  } else {
    heroVideo.play().catch(() => {});
  }

  motionToggle.setAttribute("aria-pressed", String(paused));
  motionToggle.textContent = paused ? "播放动态" : "暂停动态";
}

if (reduceMotion.matches) setMotionPaused(true);

motionToggle?.addEventListener("click", () => {
  setMotionPaused(motionToggle.getAttribute("aria-pressed") !== "true");
});

if (heroVideo && "IntersectionObserver" in window) {
  const videoObserver = new IntersectionObserver(
    ([entry]) => {
      if (reduceMotion.matches || motionToggle?.getAttribute("aria-pressed") === "true") return;
      if (entry.isIntersecting) {
        heroVideo.play().catch(() => {});
      } else {
        heroVideo.pause();
      }
    },
    { threshold: 0.15 },
  );
  videoObserver.observe(heroVideo);
}

function selectFlowStage(stage) {
  if (!flow || !flowNotes[stage]) return;

  flow.querySelectorAll("[data-flow-control]").forEach((control) => {
    control.setAttribute("aria-selected", String(control.dataset.flowControl === stage));
  });

  flow.querySelectorAll("[data-flow-stage]").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.flowStage === stage);
  });

  if (flowNote) flowNote.textContent = flowNotes[stage];

  if (window.matchMedia("(max-width: 980px)").matches) {
    const track = flow.querySelector(".asset-flow-track");
    const activeStage = flow.querySelector(`[data-flow-stage="${stage}"]`);
    if (track && activeStage) {
      track.scrollTo({
        left: activeStage.offsetLeft - (track.clientWidth - activeStage.clientWidth) / 2,
        behavior: reduceMotion.matches ? "auto" : "smooth",
      });
    }
  }
}

flow?.addEventListener("click", (event) => {
  const control = event.target.closest("[data-flow-control]");
  if (control) selectFlowStage(control.dataset.flowControl);
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    const basePath = location.hostname.endsWith("github.io") ? "/yuanweigou/" : "/";
    navigator.serviceWorker
      .register(`${basePath}sw.js?v=20260711-mobile-v3`)
      .then((registration) => registration.update().catch(() => {}))
      .catch(() => {});
  });
}
