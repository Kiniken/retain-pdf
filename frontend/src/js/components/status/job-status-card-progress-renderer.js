import {
  STATUS_CARD_IDS,
  STATUS_CARD_SELECTORS,
  statusCardElementById,
} from "./job-status-card-dom-contract.js";

function progressRenderPercent(value) {
  const numericValue = Number(value);
  return Math.max(0, Math.min(100, Number.isFinite(numericValue) ? numericValue : 0));
}

function setElementDatasetValue(element, key, value) {
  if (element?.dataset) {
    element.dataset[key] = value;
  }
}

function setElementStyleProperty(element, key, value) {
  if (typeof element?.style?.setProperty === "function") {
    element.style.setProperty(key, value);
  }
}

export function renderProgressComponents(host, {
  percent = 0,
  text = "",
  indeterminate = false,
} = {}) {
  const safePercent = progressRenderPercent(percent);
  const roundedPercent = Math.round(safePercent);
  const ring = statusCardElementById(host, STATUS_CARD_IDS.progressRing);
  const ringMeta = statusCardElementById(host, STATUS_CARD_IDS.progressRingMeta);
  const progressBar = statusCardElementById(host, STATUS_CARD_IDS.progressBar);
  const progressPercent = statusCardElementById(host, STATUS_CARD_IDS.progressPercent);
  if (ring) {
    const ringText = ring.querySelector?.(".status-progress-ring-text") || ring;
    const renderedPercent = indeterminate ? 42 : safePercent;
    ring.value = safePercent;
    ring.setAttribute("value", `${safePercent}`);
    ring.setAttribute("aria-valuenow", `${safePercent}`);
    setElementDatasetValue(ring, "value", `${safePercent}`);
    setElementStyleProperty(ring, "--status-ring-percent", `${renderedPercent}%`);
    ringText.textContent = indeterminate ? "..." : `${roundedPercent}%`;
    ring.classList.toggle("is-indeterminate", Boolean(indeterminate));
  }
  if (ringMeta) {
    ringMeta.textContent = text || (indeterminate ? "处理中" : `${roundedPercent}%`);
  }
  if (progressPercent) {
    progressPercent.textContent = indeterminate ? "处理中" : `${roundedPercent}%`;
  }
  if (progressBar) {
    progressBar.value = safePercent;
    progressBar.setAttribute("value", `${safePercent}`);
    progressBar.setAttribute("aria-valuenow", `${safePercent}`);
    setElementDatasetValue(progressBar, "value", `${safePercent}`);
    setElementStyleProperty(progressBar, "--status-progress-percent", `${safePercent}%`);
    progressBar.toggleAttribute("indeterminate", Boolean(indeterminate));
    progressBar.classList.toggle("is-indeterminate", Boolean(indeterminate));
  }
}

export function renderProgressModel(host, {
  visible = false,
  percent = 0,
  text = "",
  componentText = "-",
  indeterminate = false,
  legacyIndeterminate = false,
} = {}) {
  const block = host.querySelector(STATUS_CARD_SELECTORS.progressBlock);
  const bar = statusCardElementById(host, STATUS_CARD_IDS.legacyProgressBar);
  const textEl = statusCardElementById(host, STATUS_CARD_IDS.progressText);
  if (!bar || !textEl) {
    return;
  }
  block?.classList.toggle("hidden", !visible);
  if (!visible) {
    bar.style.width = "0%";
    bar.classList.remove("is-indeterminate");
    textEl.textContent = "";
    renderProgressComponents(host, { percent: 0, text: "-", indeterminate: false });
    return;
  }
  bar.classList.toggle("is-indeterminate", Boolean(legacyIndeterminate));
  bar.style.width = `${progressRenderPercent(percent)}%`;
  textEl.textContent = text;
  renderProgressComponents(host, {
    percent,
    text: componentText,
    indeterminate,
  });
}
