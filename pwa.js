const metrionScriptUrl = document.currentScript?.src || new URL("pwa.js", location.href).href;
const metrionSiteRoot = new URL(".", metrionScriptUrl);
const METRION_BUILD_VERSION = "20260604-agent-copy-fix";

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  let metrionReloadingForUpdate = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (metrionReloadingForUpdate) return;
    if (sessionStorage.getItem("metrion-sw-reloaded") === METRION_BUILD_VERSION) return;
    metrionReloadingForUpdate = true;
    sessionStorage.setItem("metrion-sw-reloaded", METRION_BUILD_VERSION);
    location.reload();
  });

  window.addEventListener("load", () => {
    const basePath = location.hostname.endsWith("github.io") ? "/yuanweigou/" : "/";
    navigator.serviceWorker
      .register(`${basePath}sw.js?v=${METRION_BUILD_VERSION}`)
      .then((registration) => registration.update().catch(() => {}))
      .catch(() => {});
  });
}

function metrionLoadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = [...document.scripts].find((script) => script.src === src);
    if (existing) {
      if (window.MetrionAgent) resolve();
      else existing.addEventListener("load", resolve, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });
}

function metrionNormalizeAssistantLinks(root) {
  root.querySelectorAll("a[href]").forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (!href || /^(https?:|mailto:|tel:|#)/i.test(href)) return;
    const cleanHref = href.startsWith("./") ? href.slice(2) : href;
    anchor.href = new URL(cleanHref, metrionSiteRoot).href;
  });
}

function metrionAddAssistantMessage(messages, role, content) {
  const message = document.createElement("article");
  message.className = `metrion-assistant-message ${role}`;
  message.innerHTML = role === "user" ? `<p>${window.MetrionAgent.escapeHtml(content)}</p>` : content;
  messages.appendChild(message);
  metrionNormalizeAssistantLinks(message);
  return message;
}

function metrionScrollToMessage(messages, message) {
  if (!message) return;
  messages.scrollTop = Math.max(0, message.offsetTop - messages.offsetTop - 12);
}

function metrionCreateAssistantWidget() {
  if (document.querySelector("[data-metrion-assistant-widget]")) return;
  if (location.pathname.endsWith("/agent.html") || location.pathname.endsWith("agent.html")) return;

  const widget = document.createElement("aside");
  widget.className = "metrion-assistant-widget";
  widget.setAttribute("data-metrion-assistant-widget", "");
  widget.innerHTML = `
    <button class="metrion-assistant-trigger" type="button" aria-expanded="false" aria-controls="metrionAssistantPanel">
      <img src="${new URL("assets/assistant-float-icon.png", metrionSiteRoot).href}" alt="" />
      <span>问问元维构</span>
    </button>
    <section class="metrion-assistant-panel" id="metrionAssistantPanel" aria-label="元维构项目咨询助手" hidden>
      <header>
        <div>
          <span>METRION</span>
          <strong>项目咨询助手</strong>
        </div>
        <button type="button" data-metrion-assistant-close aria-label="关闭咨询助手">×</button>
      </header>
      <div class="metrion-assistant-suggestions" aria-label="推荐问题">
        <button type="button" data-metrion-assistant-prompt="元维构是什么？">项目介绍</button>
        <button type="button" data-metrion-assistant-prompt="我的作品适合转译吗？需要提供什么资料？">作品判断</button>
        <button type="button" data-metrion-assistant-prompt="少儿美术机构30个学生可以批量合作吗？">教育合作</button>
      </div>
      <div class="metrion-assistant-messages" data-metrion-assistant-messages></div>
      <form class="metrion-assistant-form" data-metrion-assistant-form>
        <label class="sr-only" for="metrionAssistantQuestion">输入你的问题</label>
        <textarea id="metrionAssistantQuestion" rows="2" placeholder="输入问题，例如：我有一张画，能做成立体作品吗？" data-metrion-assistant-input></textarea>
        <button type="submit">发送</button>
      </form>
      <p class="metrion-assistant-note">具体作品、授权销售和最终报价以人工确认为准。</p>
    </section>
  `;

  document.body.appendChild(widget);

  const trigger = widget.querySelector(".metrion-assistant-trigger");
  const panel = widget.querySelector(".metrion-assistant-panel");
  const close = widget.querySelector("[data-metrion-assistant-close]");
  const messages = widget.querySelector("[data-metrion-assistant-messages]");
  const form = widget.querySelector("[data-metrion-assistant-form]");
  const input = widget.querySelector("[data-metrion-assistant-input]");
  const promptButtons = widget.querySelectorAll("[data-metrion-assistant-prompt]");
  let hasWelcomed = false;

  function openPanel() {
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    widget.classList.add("is-open");
    metrionLoadScript(new URL("agent.js?v=20260604-agent-copy-fix", metrionSiteRoot).href)
      .then(() => {
        if (!hasWelcomed && window.MetrionAgent) {
          const welcome = metrionAddAssistantMessage(messages, "agent", window.MetrionAgent.answerToHtml(window.MetrionAgent.WELCOME));
          metrionScrollToMessage(messages, welcome);
          hasWelcomed = true;
        }
        input.focus();
      })
      .catch(() => {
        window.location.href = new URL("agent.html", metrionSiteRoot).href;
      });
  }

  function closePanel() {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    widget.classList.remove("is-open");
  }

  function ask(question) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || !window.MetrionAgent) return;
    const userMessage = metrionAddAssistantMessage(messages, "user", cleanQuestion);
    input.value = "";
    const answer = window.MetrionAgent.findAnswer(cleanQuestion);
    metrionAddAssistantMessage(messages, "agent", window.MetrionAgent.answerToHtml(answer));
    metrionScrollToMessage(messages, userMessage);
  }

  function ensureAgentReady() {
    if (window.MetrionAgent) return Promise.resolve();
    return metrionLoadScript(new URL("agent.js?v=20260604-agent-copy-fix", metrionSiteRoot).href);
  }

  trigger.addEventListener("click", () => {
    if (panel.hidden) openPanel();
    else closePanel();
  });

  close.addEventListener("click", closePanel);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = input.value;
    ensureAgentReady()
      .then(() => ask(question))
      .catch(() => {
        window.location.href = new URL("agent.html", metrionSiteRoot).href;
      });
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      form.requestSubmit();
    }
  });

  promptButtons.forEach((button) => {
    button.addEventListener("click", () => {
      openPanel();
      ensureAgentReady().then(() => ask(button.dataset.metrionAssistantPrompt || ""));
    });
  });

  messages.addEventListener("click", (event) => {
    const button = event.target.closest("[data-agent-inline-prompt]");
    if (!button) return;
    ensureAgentReady().then(() => ask(button.dataset.agentInlinePrompt || ""));
  });
}

document.addEventListener("DOMContentLoaded", metrionCreateAssistantWidget);
