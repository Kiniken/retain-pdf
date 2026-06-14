import { STAGE_SUBSTAGES } from "./job-status-card-presets.js";

export function translationSubstageKeyForSnapshot(snapshot = null) {
  const explicitSubstage = `${snapshot?.substageKey || ""}`.trim();
  if (explicitSubstage) {
    return explicitSubstage;
  }
  const text = `${snapshot?.label || ""} ${snapshot?.value || ""} ${snapshot?.progressText || ""}`.toLowerCase();
  if (text.includes("跨栏") || text.includes("跨页")) {
    return "continuation_review";
  }
  if (text.includes("页面策略") || text.includes("块分类")) {
    return "page_policies";
  }
  if (text.includes("乱码")) {
    return "garbled_repair";
  }
  if (text.includes("翻译批次") || (text.includes("第 ") && text.includes(" 批"))) {
    return "translation_batches";
  }
  if (snapshot?.stageKey === "translate") {
    return "translation_batches";
  }
  return "";
}

function substageKeyForSnapshot(snapshot = null) {
  const explicitSubstage = `${snapshot?.substageKey || ""}`.trim();
  if (explicitSubstage) {
    return explicitSubstage;
  }
  if (snapshot?.stageKey === "translate") {
    return translationSubstageKeyForSnapshot(snapshot);
  }
  return "";
}

function labelForSubstage(stageKey, substageKey) {
  const substages = STAGE_SUBSTAGES[stageKey] || [];
  return substages.find((item) => item.key === substageKey)?.label || substageKey;
}

function collectVisibleSubstages(stageKey, activeKey, selectedProgress = null) {
  const known = STAGE_SUBSTAGES[stageKey] || [];
  const knownKeys = new Set(known.map((item) => item.key));
  const bySubstage = selectedProgress?.bySubstage || {};
  const visibleKeys = Object.keys(bySubstage)
    .filter((key) => knownKeys.has(key));
  if (activeKey && knownKeys.has(activeKey) && !visibleKeys.includes(activeKey)) {
    visibleKeys.push(activeKey);
  }
  return known.filter((item) => visibleKeys.includes(item.key));
}

export function syncStageSubstageStates(container, selectedStageKey, selectedIsCurrent, snapshot, selectedProgress = null) {
  if (!container) {
    return;
  }
  const activeKey = selectedProgress?.substageKey || (selectedIsCurrent ? substageKeyForSnapshot(snapshot) : "");
  const substages = collectVisibleSubstages(selectedStageKey, activeKey, selectedProgress);
  container.classList.toggle("hidden", substages.length === 0);
  container.style.setProperty("--status-substage-count", `${Math.min(Math.max(substages.length, 1), 5)}`);
  container.innerHTML = substages
    .map((item) => `<wa-badge class="status-substage-step" data-substage-key="${item.key}" pill appearance="filled-outlined" variant="neutral">${labelForSubstage(selectedStageKey, item.key)}</wa-badge>`)
    .join("");
  container.querySelectorAll(".status-substage-step").forEach((step) => {
    const key = step.dataset.substageKey || "";
    const stepIndex = substages.findIndex((item) => item.key === key);
    const activeIndex = substages.findIndex((item) => item.key === activeKey);
    step.classList.toggle("is-active", key === activeKey);
    step.classList.toggle("is-done", activeIndex >= 0 && stepIndex >= 0 && stepIndex < activeIndex);
    step.setAttribute("appearance", key === activeKey ? "filled" : "filled-outlined");
  });
}
