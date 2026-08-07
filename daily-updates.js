(() => {
  const scriptUrl = document.currentScript?.src || window.location.href;
  const ROOT_URL = new URL("./", scriptUrl);
  const DATA_URL = new URL("daily-updates/index.json", ROOT_URL);
  const DAILY_ROOT_URL = new URL("daily-updates/", ROOT_URL);
  const kindLabel = (kind) => kind === "art-briefing" ? "视觉艺术早报" : "元维构项目日更";
  const dateLabel = (value) => {
    const date = new Date(`${value}T12:00:00+08:00`);
    return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(date);
  };

  const safeEntryUrl = (value) => {
    const resolved = new URL(value, ROOT_URL);
    const sameOrigin = resolved.origin === DAILY_ROOT_URL.origin;
    const insideDailyArchive = resolved.pathname.startsWith(DAILY_ROOT_URL.pathname);
    const safeProtocol = resolved.protocol === "https:" || resolved.protocol === "http:";
    if (!sameOrigin || !insideDailyArchive || !safeProtocol) {
      throw new Error("每日新构文章链接越过允许范围");
    }
    return resolved.href;
  };

  const createCard = (entry) => {
    const article = document.createElement("article");
    article.className = "daily-card";
    article.dataset.kind = entry.kind;
    article.dataset.date = entry.date;

    const meta = document.createElement("div");
    meta.className = "daily-card-meta";
    const kind = document.createElement("p");
    kind.className = "daily-card-kind";
    kind.textContent = kindLabel(entry.kind);
    const time = document.createElement("time");
    time.dateTime = entry.date;
    time.textContent = dateLabel(entry.date);
    meta.append(kind, time);

    const title = document.createElement("h3");
    title.textContent = entry.title;
    const summary = document.createElement("p");
    summary.className = "daily-card-summary";
    summary.textContent = entry.summary;
    const link = document.createElement("a");
    link.className = "daily-card-link";
    link.href = safeEntryUrl(entry.url);
    link.textContent = "阅读全文 →";
    link.setAttribute("aria-label", `阅读${entry.title}`);

    article.append(meta, title, summary, link);
    return article;
  };

  const loadData = async () => {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`daily updates ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.entries)) throw new Error("invalid daily updates payload");
    return payload;
  };

  const renderHome = async (container) => {
    try {
      const payload = await loadData();
      const entries = ["metrion", "art-briefing"]
        .map((kind) => payload.entries.find((entry) => entry.kind === kind))
        .filter(Boolean);
      if (!entries.length) return;
      container.replaceChildren(...entries.map(createCard));
      const stamp = document.querySelector("[data-daily-updated]");
      if (stamp && payload.content_through) stamp.textContent = `内容更新至：${dateLabel(payload.content_through)}`;
    } catch (error) {
      console.warn("每日新构数据加载失败，保留页面内置内容。", error);
    }
  };

  const renderArchive = async (container) => {
    const filters = [...document.querySelectorAll("[data-daily-filter]")];
    let entries = [];
    let active = "all";

    const paint = () => {
      const visible = active === "all" ? entries : entries.filter((entry) => entry.kind === active);
      if (!visible.length) {
        const empty = document.createElement("p");
        empty.className = "daily-empty";
        empty.textContent = "当前分类暂无内容。";
        container.replaceChildren(empty);
        return;
      }
      container.replaceChildren(...visible.map(createCard));
    };

    try {
      const payload = await loadData();
      entries = payload.entries;
      paint();
      filters.forEach((button) => {
        button.addEventListener("click", () => {
          active = button.dataset.dailyFilter;
          filters.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
          paint();
        });
      });
    } catch (error) {
      console.warn("每日新构归档加载失败，保留页面内置内容。", error);
    }
  };

  document.querySelectorAll("[data-daily-latest]").forEach(renderHome);
  const archive = document.querySelector("[data-daily-archive]");
  if (archive) renderArchive(archive);
})();
