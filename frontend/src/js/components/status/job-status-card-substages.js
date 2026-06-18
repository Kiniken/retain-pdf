export {
  buildSubstageViewModel,
  collectVisibleSubstages,
  substageKeyForSnapshot,
  translationSubstageKeyForSnapshot,
} from "../../job-status/substage-view-model.js";

import {
  buildSubstageViewModel,
} from "../../job-status/substage-view-model.js";

export function syncStageSubstageStates(container, selectedStageKey, selectedIsCurrent, snapshot, selectedProgress = null) {
  if (!container) {
    return;
  }
  const viewModel = buildSubstageViewModel({
    selectedStageKey,
    selectedIsCurrent,
    snapshot,
    selectedProgress,
  });
  container.classList.toggle("hidden", viewModel.hidden);
  container.style.setProperty("--status-substage-count", `${viewModel.cssCount}`);
  container.innerHTML = viewModel.items
    .map((item) => `<span class="status-substage-step" data-substage-key="${item.key}">${item.label}</span>`)
    .join("");
  container.querySelectorAll(".status-substage-step").forEach((step) => {
    const key = step.dataset.substageKey || "";
    const item = viewModel.items.find((entry) => entry.key === key);
    step.classList.toggle("is-active", Boolean(item?.active));
    step.classList.toggle("is-done", Boolean(item?.done));
  });
}
