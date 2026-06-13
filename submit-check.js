const FORM_URL = "https://wj.qq.com/s2/26765122/e267/";

const CHECK_ITEMS = {
  frontImage: { label: "清晰作品正面图", weight: 18 },
  detailImage: { label: "局部细节图或参考角度", weight: 10 },
  authorSource: { label: "作者、来源或作品背景说明", weight: 14 },
  usageDetail: { label: "计划用途说明", weight: 12 },
  rightsState: { label: "公开展示、宣传或销售授权状态", weight: 16 },
  sizeQuantity: { label: "期望尺寸、数量或预算区间", weight: 10 },
  deliveryForm: { label: "期望形式：浮雕、摆件、包装、展签或数字档案", weight: 8 },
  deadline: { label: "期望交付时间", weight: 5 },
  contact: { label: "联系方式", weight: 7 },
};

function valueOf(selector) {
  return document.querySelector(selector)?.value || "";
}

function checkedKeys() {
  return [...document.querySelectorAll('.submit-checklist input[type="checkbox"]:checked')].map((input) => input.value);
}

function riskNotes(role, artwork, usage, rights) {
  const notes = [];

  if (role === "家长" || artwork === "儿童画/青少年创作" || rights === "儿童作品，监护人可确认") {
    notes.push("儿童或学生作品建议补充监护人确认，机构宣传、公开展示和销售用途要分开说明。");
  }

  if (usage === "授权销售/联名合作" || artwork === "IP形象/商业图像") {
    notes.push("涉及销售、联名、渠道或分成时，不能只提交图片，需要说明权利方、授权范围、数量和销售方式。");
  }

  if (rights === "来源清楚，但授权待确认") {
    notes.push("当前可以进入方向判断，但不建议直接进入公开宣传或销售报价。");
  }

  if (rights === "来源或授权暂不清楚") {
    notes.push("建议先补充来源和权利方信息。来源不清楚的作品不适合直接进入商业化判断。");
  }

  if (usage === "数字档案/虚拟展厅") {
    notes.push("如果需要网页模型或虚拟展厅，建议说明哪些内容可以公开、哪些源文件需要保密。");
  }

  return notes.length ? notes : ["当前没有明显高风险提示，但具体作品仍需要人工确认。"];
}

function statusFor(score, missing) {
  if (score >= 82 && missing.length <= 1) return "可以进入提交";
  if (score >= 58) return "接近可提交";
  return "需要先补资料";
}

function recommendationFor(role, usage, score) {
  if (score < 58) return "先补齐基础资料，再进入表单会更有效。";
  if (usage === "课程成果/结课展示" || role === "教育机构") return "适合按教育机构/班级批量方向提交，并补充学生数量、课程主题和交付时间。";
  if (usage === "授权销售/联名合作") return "适合先提交作品判断，同时标注授权销售意向，后续需要人工确认权利和合同边界。";
  if (usage === "数字档案/虚拟展厅") return "适合提交作品图和公开范围说明，再判断是否进入二维码档案、网页模型或虚拟展厅。";
  return "适合进入作品转译初判，先确认结构潜力、适合形式和初步交付方向。";
}

function renderCheck() {
  const role = valueOf("[data-submit-role]");
  const artwork = valueOf("[data-submit-artwork]");
  const usage = valueOf("[data-submit-usage]");
  const rights = valueOf("[data-submit-rights]");
  const checked = checkedKeys();
  const missing = Object.entries(CHECK_ITEMS).filter(([key]) => !checked.includes(key));
  const score = checked.reduce((sum, key) => sum + CHECK_ITEMS[key].weight, 0);
  const status = statusFor(score, missing);
  const notes = riskNotes(role, artwork, usage, rights);
  const recommendation = recommendationFor(role, usage, score);

  document.querySelector("[data-submit-score]").textContent = `${score}%`;
  document.querySelector("[data-submit-status]").textContent = status;
  document.querySelector("[data-submit-bar]").style.width = `${score}%`;
  document.querySelector("[data-submit-hero-score]").textContent = `${score}%`;
  document.querySelector("[data-submit-hero-status]").textContent = status;
  document.querySelector("[data-submit-hero-bar]").style.width = `${score}%`;

  const result = document.querySelector("[data-submit-result]");
  result.innerHTML = `
    <h3>${status}</h3>
    <p>${recommendation}</p>
    <div class="submit-result-block">
      <strong>还需要补充</strong>
      <ul>
        ${
          missing.length
            ? missing.map(([, item]) => `<li>${item.label}</li>`).join("")
            : "<li>基础资料已经齐全，可以进入作品判断表单。</li>"
        }
      </ul>
    </div>
    <div class="submit-result-block warning">
      <strong>需要注意</strong>
      <ul>${notes.map((note) => `<li>${note}</li>`).join("")}</ul>
    </div>
  `;

  const prepared = checked.map((key) => `- ${CHECK_ITEMS[key].label}`).join("\n") || "- 暂未勾选资料";
  const missingText = missing.map(([, item]) => `- ${item.label}`).join("\n") || "- 无明显缺项";
  const notesText = notes.map((note) => `- ${note}`).join("\n");

  document.querySelector("[data-submit-summary]").value = `元维构作品提交资料摘要

身份：${role}
作品类型：${artwork}
计划用途：${usage}
权利状态：${rights}
资料完整度：${score}%
当前状态：${status}

已准备资料：
${prepared}

建议补充：
${missingText}

风险与边界提示：
${notesText}

下一步建议：
${recommendation}`;
}

async function copySummary() {
  const summary = document.querySelector("[data-submit-summary]");
  const button = document.querySelector("[data-copy-summary]");
  try {
    await navigator.clipboard.writeText(summary.value);
    button.textContent = "已复制";
  } catch {
    summary.select();
    button.textContent = "请手动复制";
  }
  window.setTimeout(() => {
    button.textContent = "复制摘要";
  }, 1800);
}

function initSubmitCheck() {
  document.querySelectorAll(".submit-checklist input, .submit-controls select").forEach((control) => {
    control.addEventListener("change", renderCheck);
  });
  document.querySelector("[data-copy-summary]")?.addEventListener("click", copySummary);
  document.querySelectorAll(`a[href="${FORM_URL}"]`).forEach((link) => {
    link.addEventListener("click", () => {
      renderCheck();
    });
  });
  renderCheck();
}

document.addEventListener("DOMContentLoaded", initSubmitCheck);
