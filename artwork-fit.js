const FIT_STATE = {
  role: "个人创作者",
  artwork: "绘画/插画",
  usage: "数字档案/虚拟展厅",
  rights: "本人或机构拥有权利",
  delivery: "数字档案/3D预览",
};

const FIT_PACKAGES = {
  education: {
    title: "教育成果转译与档案包",
    copy: "适合儿童画、课程成果和机构展示，重点准备监护人确认、班级数量、包装方式和展示范围。",
  },
  archive: {
    title: "数字档案标准转译包",
    copy: "适合先建立实体样本、展示文件、作品说明和网页 3D 预览，再决定是否公开展示或授权运营。",
  },
  licensing: {
    title: "授权运营预评估包",
    copy: "适合艺术家、IP 方或品牌方进入衍生品、收藏版、礼品和联名测试前的权利与文件等级确认。",
  },
  gallery: {
    title: "展览与网页 3D 展厅包",
    copy: "适合美术馆、画廊、艺术节和展示空间，把作品、展签、数字档案和线上展厅连接起来。",
  },
  enterprise: {
    title: "企业内容资产样板包",
    copy: "适合把企业项目经验、服务场景或组织记忆转译成实体物件、案例卡、数字档案和讨论材料。",
  },
  service: {
    title: "单件样本转译服务包",
    copy: "适合先做一件实体样本或涂装收藏版，用于收藏、展示、礼品或后续合作沟通。",
  },
};

const BASE_CHECKLIST = ["清晰作品正面图", "作品局部或参考角度", "作品名称、作者和来源说明", "计划用途说明", "期望尺寸、数量和预算区间", "联系方式"];

function fitQuery(selector, root = document) {
  return root.querySelector(selector);
}

function fitQueryAll(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function scoreFit() {
  let score = 58;

  if (FIT_STATE.artwork === "绘画/插画" || FIT_STATE.artwork === "儿童画/青少年创作") score += 10;
  if (FIT_STATE.artwork === "企业内容/项目资料") score += 4;
  if (FIT_STATE.usage === "数字档案/虚拟展厅" || FIT_STATE.usage === "展览展示/公共教育") score += 10;
  if (FIT_STATE.usage === "个人纪念/收藏" || FIT_STATE.usage === "课程成果/机构展示") score += 8;
  if (FIT_STATE.delivery === "数字档案/3D预览" || FIT_STATE.delivery === "实体样本") score += 8;
  if (FIT_STATE.delivery === "空间装置" || FIT_STATE.delivery === "网页3D展厅") score += 5;

  if (FIT_STATE.rights === "本人或机构拥有权利" || FIT_STATE.rights === "已获得授权") score += 12;
  if (FIT_STATE.rights === "监护人可确认") score += 8;
  if (FIT_STATE.rights === "来源清楚，授权待确认") score -= 8;
  if (FIT_STATE.rights === "来源或授权不清楚") score -= 24;

  if (FIT_STATE.usage === "授权销售/联名合作" && FIT_STATE.rights !== "已获得授权" && FIT_STATE.rights !== "本人或机构拥有权利") score -= 12;
  if (FIT_STATE.delivery === "授权商品测试" && FIT_STATE.rights.includes("不清楚")) score -= 10;

  return Math.max(28, Math.min(96, score));
}

function packageForState() {
  if (FIT_STATE.role === "教育机构" || FIT_STATE.artwork === "儿童画/青少年创作" || FIT_STATE.usage === "课程成果/机构展示") return FIT_PACKAGES.education;
  if (FIT_STATE.role === "美术馆/画廊" || FIT_STATE.delivery === "网页3D展厅" || FIT_STATE.usage === "展览展示/公共教育") return FIT_PACKAGES.gallery;
  if (FIT_STATE.role === "企业/品牌方" || FIT_STATE.artwork === "企业内容/项目资料") return FIT_PACKAGES.enterprise;
  if (FIT_STATE.usage === "授权销售/联名合作" || FIT_STATE.delivery === "授权商品测试") return FIT_PACKAGES.licensing;
  if (FIT_STATE.usage === "数字档案/虚拟展厅" || FIT_STATE.delivery === "数字档案/3D预览") return FIT_PACKAGES.archive;
  return FIT_PACKAGES.service;
}

function scoreLabel(score) {
  if (FIT_STATE.rights === "来源或授权不清楚") return "权利状态不清楚，建议先做资料整理，不进入商业化判断。";
  if (score >= 82) return "良好，建议进入人工确认阶段。";
  if (score >= 66) return "可以进入初步咨询，建议补充资料后再报价。";
  return "需要先补充作品资料和权利说明。";
}

function rightsCopy() {
  if (FIT_STATE.rights === "来源或授权不清楚") return "当前不建议进入公开展示、宣传或销售判断。请先确认原作来源、作者、版权方或监护人授权。";
  if (FIT_STATE.rights === "来源清楚，授权待确认") return "可以做方向咨询，但公开展示、宣传使用、销售授权和源文件交付需要在权利方确认后再推进。";
  if (FIT_STATE.rights === "监护人可确认") return "儿童作品需要监护人确认；机构宣传、公开展示、礼赠和销售用途要分开说明。";
  if (FIT_STATE.usage === "授权销售/联名合作") return "授权销售、联名合作、复制生产和分成机制需要单独合同确认，不等同于普通样本制作。";
  return "制作、公开展示、宣传使用、销售授权和源文件交付需要分开确认。";
}

function checklistForState() {
  const items = [...BASE_CHECKLIST];
  if (FIT_STATE.artwork === "儿童画/青少年创作" || FIT_STATE.rights === "监护人可确认") items.push("监护人或机构授权说明");
  if (FIT_STATE.usage === "授权销售/联名合作" || FIT_STATE.delivery === "授权商品测试") items.push("销售、联名或分成预期");
  if (FIT_STATE.delivery === "网页3D展厅" || FIT_STATE.usage === "数字档案/虚拟展厅") items.push("是否需要公开页面、二维码或私密访问");
  if (FIT_STATE.delivery === "空间装置") items.push("安装空间、尺寸范围和展期时间");
  if (FIT_STATE.artwork === "企业内容/项目资料") items.push("企业资料公开范围与内部使用边界");
  return [...new Set(items)].slice(0, 9);
}

function renderFit() {
  const score = scoreFit();
  const selectedPackage = packageForState();
  const checklist = checklistForState();

  fitQuery("[data-fit-score]").textContent = score;
  fitQuery("[data-fit-bar]").style.width = `${score}%`;
  fitQuery("[data-fit-hero-score]").textContent = score;
  fitQuery("[data-fit-hero-bar]").style.width = `${score}%`;
  fitQuery("[data-fit-score-label]").textContent = scoreLabel(score);
  fitQuery("[data-fit-hero-text]").textContent = scoreLabel(score);
  fitQuery("[data-fit-package]").textContent = selectedPackage.title;
  fitQuery("[data-fit-package-copy]").textContent = selectedPackage.copy;
  fitQuery("[data-fit-rights-copy]").textContent = rightsCopy();
  fitQuery("[data-fit-checklist]").innerHTML = checklist.map((item) => `<li>${item}</li>`).join("");

  fitQuery("[data-fit-summary]").value = [
    "元维构作品适配判断摘要",
    "",
    `身份：${FIT_STATE.role}`,
    `作品类型：${FIT_STATE.artwork}`,
    `计划用途：${FIT_STATE.usage}`,
    `权利状态：${FIT_STATE.rights}`,
    `交付目标：${FIT_STATE.delivery}`,
    `适配指数：${score}/100`,
    `建议服务包：${selectedPackage.title}`,
    `权利提醒：${rightsCopy()}`,
    "",
    "下一步资料清单：",
    ...checklist.map((item) => `- ${item}`),
    "",
    "说明：本摘要只用于提交前分流，具体作品是否适合转译、能否公开展示或授权销售、最终报价和合同条款仍需人工确认。",
  ].join("\n");
}

async function copyFitSummary() {
  const button = fitQuery("[data-copy-fit-summary]");
  const text = fitQuery("[data-fit-summary]").value;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "已复制摘要";
  } catch {
    fitQuery("[data-fit-summary]").select();
    button.textContent = "请手动复制";
  }
  window.setTimeout(() => {
    button.textContent = "复制摘要";
  }, 1600);
}

function initFitChecker() {
  fitQueryAll("[data-fit-group]").forEach((group) => {
    const key = group.dataset.fitGroup;
    fitQueryAll("button[data-value]", group).forEach((button) => {
      button.classList.toggle("is-selected", FIT_STATE[key] === button.dataset.value);
      button.addEventListener("click", () => {
        FIT_STATE[key] = button.dataset.value;
        fitQueryAll("button[data-value]", group).forEach((item) => {
          item.classList.toggle("is-selected", FIT_STATE[key] === item.dataset.value);
        });
        renderFit();
      });
    });
  });

  fitQuery("[data-copy-fit-summary]").addEventListener("click", copyFitSummary);
  renderFit();
}

document.addEventListener("DOMContentLoaded", initFitChecker);
