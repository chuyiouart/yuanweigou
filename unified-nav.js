(() => {
  if (document.querySelector("[data-metrion-unified-nav]")) return;

  const script = document.currentScript;
  const root = new URL(".", script?.src || window.location.href);
  const toUrl = (path) => new URL(path, root).href;
  const path = window.location.pathname.replace(/\/index\.html$/, "/");
  const isHome = path === root.pathname || path === root.pathname.replace(/\/$/, "");
  const isUtility = /ar-artwork-card|spatial-archive-ar-test|archive-label/.test(path);

  document
    .querySelectorAll("body > .site-header, body > .site-nav, body > .shell > .topbar")
    .forEach((header) => {
      header.setAttribute("aria-hidden", "true");
      header.style.setProperty("display", "none", "important");
    });

  document.body.classList.add("metrion-unified-nav-ready");

  const host = document.createElement("div");
  host.dataset.metrionUnifiedNav = "";
  if (isHome) host.dataset.overlay = "";
  if (isUtility) host.dataset.utility = "";
  document.body.prepend(host);

  const shadow = host.attachShadow({ mode: "open" });
  const groups = [
    {
      label: "每日新构",
      href: "index.html#daily-updates",
    },
    {
      label: "体验",
      items: [
        ["mobile-structure-lab/", "克林姆特结构互动", "分层、模型与包装"],
        ["translation-workshop.html", "结构转译工坊", "作品适配与空间拆解"],
        ["artwork-fit.html", "作品适配判断", "先判断是否适合转译"],
        ["agent.html", "项目咨询助手", "快速查询流程与服务"],
      ],
    },
    {
      label: "案例",
      items: [
        ["cases/foreign-artist.html", "艺术家案例", "Stage play 完整转译路径"],
        ["cases/youth-creator.html", "青少年案例", "创作、实体与成果展示"],
        ["cases/sample-data.html", "36 组样本数据", "查看结构转译记录"],
        ["cases/test-series.html", "测试系列", "跨媒介样本案例库"],
      ],
    },
    {
      label: "展览与 AR",
      items: [
        ["virtual-gallery.html", "网页 3D 展厅", "在线浏览虚拟展览"],
        ["quest-gallery.html", "VR 美术馆", "面向展览现场的沉浸体验"],
        ["spatial-archive.html#viewer", "穆夏数字档案与 AR", "网页 3D、现实空间放置"],
        ["spatial-archive.html#archive-system", "空间数字档案", "作品、模型与授权记录"],
      ],
    },
    {
      label: "服务与合作",
      items: [
        ["education.html", "教育机构方案", "课程成果与展览延展"],
        ["services.html", "服务与价格", "制作、交付与合作方式"],
        ["licensing.html", "授权模式", "权属边界与运营路径"],
        ["trust.html", "可信与 FAQ", "流程、版权与文件安全"],
      ],
    },
  ];

  const groupMarkup = groups
    .map(
      (group) => group.href
        ? `<a class="nav-direct" href="${toUrl(group.href)}">${group.label}</a>`
        : `
        <details class="nav-group">
          <summary>${group.label}<span aria-hidden="true"></span></summary>
          <div class="submenu">
            ${group.items
              .map(
                ([href, title, note]) => `
                  <a href="${toUrl(href)}">
                    <strong>${title}</strong>
                    <small>${note}</small>
                  </a>`,
              )
              .join("")}
          </div>
        </details>`,
    )
    .join("");

  shadow.innerHTML = `
    <style>
      :host {
        position: sticky;
        z-index: 100000;
        top: 0;
        display: block;
        width: 100%;
        color: #fff;
        font-family: Inter, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif;
        letter-spacing: 0;
      }

      :host([data-overlay]) {
        position: fixed;
        inset: 0 0 auto;
      }

      *, *::before, *::after { box-sizing: border-box; }
      a { color: inherit; text-decoration: none; }
      button, summary { font: inherit; letter-spacing: 0; }

      .bar {
        min-height: 68px;
        border-bottom: 1px solid rgba(255,255,255,.14);
        background: rgba(4, 13, 11, .92);
        backdrop-filter: blur(18px) saturate(1.15);
        -webkit-backdrop-filter: blur(18px) saturate(1.15);
      }

      :host([data-overlay]) .bar { background: rgba(4, 11, 10, .52); }

      .inner {
        width: min(100%, 1536px);
        min-height: 68px;
        margin: 0 auto;
        padding: 8px clamp(18px, 3.5vw, 54px);
        display: grid;
        grid-template-columns: minmax(170px, 1fr) auto minmax(170px, 1fr);
        align-items: center;
        gap: 22px;
      }

      .brand {
        justify-self: start;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      .brand img {
        width: 34px;
        height: 34px;
        border-radius: 5px;
        object-fit: cover;
      }

      .brand span { display: grid; gap: 2px; }
      .brand strong { font-size: 15px; line-height: 1; }
      .brand small { color: rgba(255,255,255,.62); font-size: 9px; line-height: 1; }

      .groups { display: flex; align-items: center; justify-content: center; gap: clamp(18px, 2.4vw, 38px); }
      .nav-group { position: relative; }
      .nav-direct,
      .nav-group summary {
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: rgba(255,255,255,.84);
        cursor: pointer;
        list-style: none;
        font-size: 13px;
        font-weight: 620;
        white-space: nowrap;
      }
      .nav-group summary::-webkit-details-marker { display: none; }
      .nav-group summary > span {
        width: 7px;
        height: 7px;
        border-right: 1px solid currentColor;
        border-bottom: 1px solid currentColor;
        transform: translateY(-2px) rotate(45deg);
        transition: transform 180ms ease;
      }
      .nav-group[open] summary > span { transform: translateY(2px) rotate(225deg); }

      .submenu {
        position: absolute;
        top: calc(100% + 3px);
        left: 50%;
        width: 286px;
        padding: 8px;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 8px;
        background: rgba(5, 22, 17, .98);
        box-shadow: 0 20px 48px rgba(0,0,0,.28);
        transform: translateX(-50%);
      }
      .submenu a {
        display: grid;
        gap: 4px;
        min-height: 58px;
        padding: 10px 12px;
        border-radius: 5px;
      }
      .submenu a:hover, .submenu a:focus-visible, .submenu a[aria-current="page"] {
        background: rgba(255,255,255,.1);
      }
      .submenu strong { font-size: 13px; line-height: 1.25; }
      .submenu small { color: rgba(255,255,255,.58); font-size: 11px; line-height: 1.35; }

      .submit {
        justify-self: end;
        min-height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 9px 16px;
        border: 1px solid rgba(255,255,255,.68);
        border-radius: 6px;
        font-size: 12px;
        font-weight: 720;
        white-space: nowrap;
      }
      .submit:hover, .submit:focus-visible { color: #10231d; background: #fff; }

      .menu-toggle { display: none; }
      a:focus-visible, summary:focus-visible, button:focus-visible { outline: 3px solid #8bd0b1; outline-offset: 3px; }

      @media (max-width: 980px) {
        .inner { grid-template-columns: 1fr auto; min-height: 62px; }
        .bar { min-height: 62px; }
        .submit { display: none; }
        .menu-toggle {
          justify-self: end;
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          padding: 0;
          border: 0;
          background: transparent;
          color: #fff;
          cursor: pointer;
        }
        .menu-toggle i, .menu-toggle i::before, .menu-toggle i::after {
          display: block;
          width: 20px;
          height: 1px;
          background: currentColor;
          content: "";
        }
        .menu-toggle i { position: relative; }
        .menu-toggle i::before { position: absolute; top: -6px; }
        .menu-toggle i::after { position: absolute; top: 6px; }
        .groups {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          display: none;
          max-height: calc(100svh - 62px);
          overflow-y: auto;
          padding: 8px 16px 20px;
          background: rgba(4, 18, 14, .99);
          border-bottom: 1px solid rgba(255,255,255,.16);
        }
        .groups.is-open { display: grid; gap: 0; }
        .nav-direct {
          min-height: 52px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,.1);
          font-size: 14px;
        }
        .nav-group { border-bottom: 1px solid rgba(255,255,255,.1); }
        .nav-group summary { width: 100%; min-height: 52px; justify-content: space-between; font-size: 14px; }
        .submenu {
          position: static;
          width: 100%;
          padding: 0 0 10px;
          border: 0;
          background: transparent;
          box-shadow: none;
          transform: none;
        }
        .submenu a { min-height: 54px; padding-left: 10px; }
        .submenu strong { font-size: 14px; }
        .submenu small { font-size: 12px; }
      }

      @media print { :host { display: none; } }
    </style>
    <header class="bar">
      <div class="inner">
        <a class="brand" href="${toUrl("index.html")}" aria-label="返回元维构首页">
          <img src="${toUrl("assets/logo.jpg")}" alt="" width="34" height="34" />
          <span><strong>元维构</strong><small>METRION</small></span>
        </a>
        <button class="menu-toggle" type="button" aria-label="打开网站菜单" aria-expanded="false"><i aria-hidden="true"></i></button>
        <nav class="groups" aria-label="网站导航">${groupMarkup}</nav>
        <a class="submit" href="${toUrl("submit-check.html")}">提交作品</a>
      </div>
    </header>`;

  const groupsPanel = shadow.querySelector(".groups");
  const menuToggle = shadow.querySelector(".menu-toggle");
  const details = [...shadow.querySelectorAll("details")];
  const links = [...shadow.querySelectorAll("a[href]")];

  links.forEach((link) => {
    const targetPath = new URL(link.href).pathname.replace(/\/index\.html$/, "/");
    if (targetPath === path) link.setAttribute("aria-current", "page");
    link.addEventListener("click", () => {
      groupsPanel.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });

  menuToggle.addEventListener("click", () => {
    const open = !groupsPanel.classList.contains("is-open");
    groupsPanel.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  details.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      details.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    details.forEach((item) => (item.open = false));
    groupsPanel.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("pointerdown", (event) => {
    if (event.composedPath().includes(host)) return;
    details.forEach((item) => (item.open = false));
  });
})();
