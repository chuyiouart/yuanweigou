const SAMPLE_ROLES = {
  visitor: {
    label: "普通访客",
    title: "先看项目能力和代表样本",
    samples: [
      ["TS01-024", "Daydream", "./cases/samples/ts01-024.html"],
      ["TS01-031", "长毛", "./cases/samples/ts01-031.html"],
      ["TS01-032", "The Starry Night", "./cases/samples/ts01-032.html"],
    ],
    fields: ["推荐用途", "材质/形态", "数字接入", "公开展示"],
    note: "适合先通过代表样本理解元维构能把二维作品转译成实体样本、包装、二维码档案和数字展示。",
  },
  parent: {
    label: "家长",
    title: "儿童画纪念、亲子活动与家庭收藏样本",
    samples: [
      ["TS01-030", "尖大", "./cases/samples/ts01-030.html"],
      ["TS01-031", "长毛", "./cases/samples/ts01-031.html"],
      ["青少年案例", "青少年创作案例", "./cases/youth-creator.html"],
    ],
    fields: ["实拍效果", "包装", "交付尺寸", "监护人确认"],
    note: "家长重点看儿童画转译、包装和纪念用途。公开展示或销售前，需要确认监护人授权边界。",
  },
  education: {
    label: "教育机构",
    title: "课程成果、班级批量与结课展示样本",
    samples: [
      ["TS01-030", "尖大", "./cases/samples/ts01-030.html"],
      ["TS01-031", "长毛", "./cases/samples/ts01-031.html"],
      ["教育专页", "教育机构合作", "./education.html"],
    ],
    fields: ["编号管理", "批量交付", "包装", "监护人授权", "二维码档案"],
    note: "教育机构重点看班级批量、课程成果和结课展示。建议同时准备学生数量、课程主题、交付时间和机构宣传用途。",
  },
  artist: {
    label: "艺术家/创作者",
    title: "作品结构转译、展览样本与权利边界",
    samples: [
      ["TS01-013", "链", "./cases/samples/ts01-013.html"],
      ["TS01-028", "前方", "./cases/samples/ts01-028.html"],
      ["TS01-033", "仪式之地", "./cases/samples/ts01-033.html"],
    ],
    fields: ["作者/来源", "源文件状态", "公开展示", "授权销售", "版权提醒"],
    note: "创作者重点看作品是否适合结构转译，以及公开展示、源文件和后续授权销售边界。",
  },
  space: {
    label: "展览/空间方",
    title: "公共教育、空间展示与数字档案样本",
    samples: [
      ["TS01-024", "Daydream", "./cases/samples/ts01-024.html"],
      ["TS01-033", "仪式之地", "./cases/samples/ts01-033.html"],
      ["TS01-036", "Stage play", "./cases/samples/ts01-036.html"],
    ],
    fields: ["推荐用途", "交付尺寸", "材质/形态", "公开展示", "数字接入"],
    note: "空间方重点看展签、二维码档案、空间陈列和可公开展示状态。具体安装和展期需要单独确认。",
  },
  brand: {
    label: "品牌/文创方",
    title: "包装测试、文创方向与授权销售前样本",
    samples: [
      ["TS01-023", "JOB", "./cases/samples/ts01-023.html"],
      ["TS01-025", "装饰人物", "./cases/samples/ts01-025.html"],
      ["TS01-026", "Knife Behind Back", "./cases/samples/ts01-026.html"],
    ],
    fields: ["包装", "交付尺寸", "授权销售", "版权与授权提醒"],
    note: "品牌和文创方向必须把样本测试与正式销售分开。能展示样本不等于已经获得复制、联名或销售授权。",
  },
};

const SAMPLE_GOALS = {
  proof: {
    label: "看实体效果",
    fields: ["实拍图", "材质/形态", "交付尺寸"],
    score: 78,
    action: "先进入测试系列案例库，看完整介绍图、实拍图和包装图。",
  },
  education: {
    label: "看教育样本",
    fields: ["青少年创作", "课程成果", "监护人授权"],
    score: 84,
    action: "重点查看青少年样本和教育机构合作页。",
  },
  space: {
    label: "看空间展示",
    fields: ["公开展示", "展签", "二维码档案"],
    score: 82,
    action: "重点查看空间数字档案和虚拟展厅样本。",
  },
  digital: {
    label: "看数字接入",
    fields: ["数字接入", "网页模型", "AR/MR"],
    score: 86,
    action: "优先查看 TS01-024、虚拟展厅和空间数字档案。",
  },
  rights: {
    label: "看版权边界",
    fields: ["作者/来源", "公开展示", "授权销售", "版权提醒"],
    score: 74,
    action: "对照样本数据表中的公开展示、授权销售和版权提醒字段。",
  },
  price: {
    label: "看报价参考",
    fields: ["尺寸", "材质", "包装", "数量"],
    score: 76,
    action: "用样本字段理解报价因素，再进入服务与价格页。",
  },
};

const SAMPLE_FOCUS = {
  visual: { label: "视觉效果", tip: "多看实拍图和完整介绍图，判断转译后的比例、层次和质感。" },
  delivery: { label: "交付方式", tip: "重点看交付尺寸、材质/形态、包装和数量。" },
  rights: { label: "授权销售", tip: "重点看公开展示、授权销售和版权提醒，不要把样本展示等同于可销售。" },
  digital: { label: "二维码/AR/虚拟展厅", tip: "重点看数字接入、网页模型和是否需要公开源文件边界。" },
  batch: { label: "批量合作", tip: "重点看编号管理、包装、交付尺寸、时间和监护人/机构授权。" },
};

function selectValue(selector) {
  return document.querySelector(selector)?.value || "";
}

function renderLinks(samples) {
  return samples
    .map(([code, title, href]) => `<a href="${href}"><span>${code}</span><strong>${title}</strong></a>`)
    .join("");
}

function renderMatch() {
  const roleKey = selectValue("[data-match-role]");
  const goalKey = selectValue("[data-match-goal]");
  const focusKey = selectValue("[data-match-focus]");
  const role = SAMPLE_ROLES[roleKey];
  const goal = SAMPLE_GOALS[goalKey];
  const focus = SAMPLE_FOCUS[focusKey];
  const fields = [...new Set([...role.fields, ...goal.fields])].slice(0, 7);
  const score = Math.min(96, Math.round((goal.score + fields.length * 2 + role.samples.length * 2) / 1.08));

  document.querySelector("[data-match-score]").textContent = score;
  document.querySelector("[data-match-bar]").style.width = `${score}%`;

  document.querySelector("[data-match-result]").innerHTML = `
    <h3>${role.title}</h3>
    <p>${role.note}</p>
    <div class="match-context">
      <div><span>身份</span><strong>${role.label}</strong></div>
      <div><span>目的</span><strong>${goal.label}</strong></div>
      <div><span>关注</span><strong>${focus.label}</strong></div>
    </div>
    <div class="match-sample-list">
      <strong>推荐查看</strong>
      ${renderLinks(role.samples)}
    </div>
    <div class="match-fields">
      <strong>建议重点看这些字段</strong>
      <ul>${fields.map((field) => `<li>${field}</li>`).join("")}</ul>
    </div>
    <div class="match-fields warning">
      <strong>判断提示</strong>
      <ul>
        <li>${goal.action}</li>
        <li>${focus.tip}</li>
        <li>涉及公开展示、授权销售、源文件和最终报价时，仍需要人工确认。</li>
      </ul>
    </div>
    <div class="match-actions">
      <a href="./cases/sample-data.html">完整样本数据表</a>
      <a href="./cases/test-series.html">测试系列案例库</a>
      <a href="./submit-check.html">提交作品判断</a>
    </div>
  `;
}

function initSampleMatch() {
  document.querySelectorAll("[data-match-role], [data-match-goal], [data-match-focus]").forEach((control) => {
    control.addEventListener("change", renderMatch);
  });
  renderMatch();
}

document.addEventListener("DOMContentLoaded", initSampleMatch);
