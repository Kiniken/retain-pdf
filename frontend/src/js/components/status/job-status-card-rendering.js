import {
  STATUS_CARD_ACTION_IDS,
  STATUS_CARD_IDS,
  STATUS_CARD_SELECTORS,
  statusCardElementById,
} from "./job-status-card-dom-contract.js";
import {
  renderProgressModel,
} from "./job-status-card-progress-renderer.js";

function setActionLinkState(link, { ready = false, url = "" } = {}) {
  if (!link) {
    return;
  }
  const enabled = Boolean(ready && url);
  link.classList.toggle("hidden", !ready);
  link.classList.toggle("disabled", !enabled);
  link.setAttribute("aria-disabled", enabled ? "false" : "true");
  link.href = enabled ? url : "#";
  link.setAttribute("href", enabled ? url : "#");
  link.dataset.url = enabled ? url : "";
}

function progressRenderPercent(value) {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }
  const numericValue = Number(value);
  return Math.max(0, Math.min(100, Number.isFinite(numericValue) ? numericValue : 0));
}

function capRunningRenderPercent(percent, stageKey = "", status = "") {
  const normalizedStageKey = `${stageKey || ""}`.trim();
  const normalizedStatus = `${status || ""}`.trim();
  if (
    normalizedStatus === "running"
    && ["ocr", "translate", "render"].includes(normalizedStageKey)
    && Number(percent) >= 100
  ) {
    return 99;
  }
  return percent;
}

export function buildProgressRenderModel({
  current = NaN,
  total = NaN,
  fallbackText = "-",
  displayPercent = null,
  percent = NaN,
  progressText = "",
  progressUnit = "",
  stageKey = "",
  status = "",
  forceVisible = null,
  indeterminate = false,
} = {}) {
  const normalizedStageKey = `${stageKey || ""}`.trim();
  const visible = forceVisible ?? ["ocr", "translate", "render"].includes(normalizedStageKey);
  if (!visible) {
    return {
      visible: false,
      percent: 0,
      text: "",
      componentText: "-",
      indeterminate: false,
      legacyIndeterminate: false,
    };
  }

  const numericCurrent = Number(current);
  const numericTotal = Number(total);
  const numericDisplayPercent = progressRenderPercent(displayPercent);
  const numericPercent = Number(percent);
  const normalizedProgressUnit = `${progressUnit || ""}`.trim();
  const textFallback = progressText || fallbackText;

  if (indeterminate) {
    return {
      visible: true,
      percent: 42,
      text: textFallback,
      componentText: textFallback,
      indeterminate: true,
      legacyIndeterminate: true,
    };
  }

  if (Number.isFinite(numericDisplayPercent)) {
    const safePercent = capRunningRenderPercent(numericDisplayPercent, normalizedStageKey, status);
    const text = progressText || `进度 ${safePercent.toFixed(0)}%`;
    return {
      visible: true,
      percent: safePercent,
      text,
      componentText: text,
      indeterminate: false,
      legacyIndeterminate: false,
    };
  }

  const hasNumbers = Number.isFinite(numericCurrent) && Number.isFinite(numericTotal) && numericTotal > 0;
  if (hasNumbers && normalizedProgressUnit === "percent") {
    const safePercent = capRunningRenderPercent(
      progressRenderPercent((numericCurrent / numericTotal) * 100),
      normalizedStageKey,
      status,
    );
    const text = progressText || `进度 ${safePercent.toFixed(0)}%`;
    return {
      visible: true,
      percent: safePercent,
      text,
      componentText: text,
      indeterminate: false,
      legacyIndeterminate: false,
    };
  }

  if (hasNumbers) {
    const safePercent = capRunningRenderPercent(
      progressRenderPercent((numericCurrent / numericTotal) * 100),
      normalizedStageKey,
      status,
    );
    const text = progressText || `${numericCurrent} / ${numericTotal} (${safePercent.toFixed(0)}%)`;
    return {
      visible: true,
      percent: safePercent,
      text,
      componentText: text,
      indeterminate: false,
      legacyIndeterminate: false,
    };
  }

  if (!hasNumbers) {
    if (Number.isFinite(numericPercent)) {
      const safePercent = capRunningRenderPercent(
        progressRenderPercent(numericPercent),
        normalizedStageKey,
        status,
      );
      const text = progressText || `进度 ${safePercent.toFixed(0)}%`;
      return {
        visible: true,
        percent: safePercent,
        text,
        componentText: text,
        indeterminate: false,
        legacyIndeterminate: false,
      };
    }
    const text = progressText || fallbackText;
    return {
      visible: true,
      percent: 0,
      text,
      componentText: text,
      indeterminate: false,
      legacyIndeterminate: false,
    };
  }
}

export function syncPrimaryActions(host, {
  pdfReady = false,
  readerReady = false,
  markdownBundleReady = false,
  pdfUrl = "",
  readerUrl = "",
  markdownBundleUrl = "",
  sourcePdfReady = false,
  sourcePdfUrl = "",
} = {}) {
  const pdfBtn = statusCardElementById(host, STATUS_CARD_ACTION_IDS.pdf);
  const readerBtn = statusCardElementById(host, STATUS_CARD_ACTION_IDS.reader);
  const markdownBundleBtn = statusCardElementById(host, STATUS_CARD_ACTION_IDS.markdownBundle);
  const sourcePdfBtn = statusCardElementById(host, STATUS_CARD_ACTION_IDS.sourcePdf);
  const actionRow = host.querySelector(STATUS_CARD_SELECTORS.resultActions);
  const body = host.querySelector(STATUS_CARD_SELECTORS.body);
  const hasActions = markdownBundleReady || pdfReady || readerReady || sourcePdfReady;
  setActionLinkState(markdownBundleBtn, { ready: markdownBundleReady, url: markdownBundleUrl });
  setActionLinkState(pdfBtn, { ready: pdfReady, url: pdfUrl });
  setActionLinkState(readerBtn, { ready: readerReady, url: readerUrl });
  setActionLinkState(sourcePdfBtn, { ready: sourcePdfReady, url: sourcePdfUrl });
  actionRow?.classList.toggle("hidden", !hasActions);
  body?.classList.toggle("has-result-actions", hasActions);
}

export function setElapsed(host, value = "-") {
  const elapsed = statusCardElementById(host, STATUS_CARD_IDS.ringElapsed);
  if (elapsed) {
    elapsed.textContent = value;
  }
}

export function setProgress(host, options = {}) {
  renderProgressModel(host, buildProgressRenderModel(options));
}

export function setCancelEnabled(host, enabled) {
  const button = statusCardElementById(host, STATUS_CARD_IDS.cancelButton);
  if (button) {
    button.disabled = !enabled;
  }
}
