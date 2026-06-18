import { DEFAULT_FILE_LABEL } from "../config/upload-constants.js";
import { $ } from "../dom/query.js";
import {
  resetUploadTileView,
  setUploadActionSlotVisible,
  setUploadProgressFill,
  setUploadProgressVisible,
  setUploadTileUploading,
} from "./upload-tile-view-port.js";
import {
  STATUS_CARD_IDS,
} from "../components/status/job-status-card-dom-contract.js";
import {
  setStatusCardActionLink,
  setStatusCardCancelEnabled as setStatusCardCancelEnabledViaPort,
  setStatusCardProgress,
  syncStatusCardPrimaryActions,
} from "./status-card-view-port.js";

export function setActionLinkView(id, url, enabled) {
  const el = $(id);
  if (!el) {
    return;
  }
  if (setStatusCardActionLink(id, url, enabled)) {
    return;
  }
  el.href = enabled && url ? url : "#";
  el.dataset.url = enabled && url ? url : "";
  el.classList.toggle("disabled", !enabled);
  el.setAttribute("aria-disabled", enabled ? "false" : "true");
}

export function syncStatusCardPrimaryActionsView(options = {}) {
  syncStatusCardPrimaryActions(options);
}

export function setStatusCardCancelEnabled(enabled) {
  setStatusCardCancelEnabledViaPort(enabled);
}

export function setLinearProgressView(barId, textId, current, total, fallbackText = "-", percentOverride = null) {
  if (barId === STATUS_CARD_IDS.legacyProgressBar && textId === STATUS_CARD_IDS.progressText) {
    if (setStatusCardProgress(current, total, fallbackText, percentOverride)) {
      return;
    }
  }
  const bar = $(barId);
  const text = $(textId);
  if (!bar || !text) {
    return;
  }
  const hasNumbers = Number.isFinite(current) && Number.isFinite(total) && total > 0;
  if (!hasNumbers) {
    bar.style.width = "0%";
    text.textContent = fallbackText;
    return;
  }
  const computedPercent = (current / total) * 100;
  const percent = Math.max(0, Math.min(100, Number.isFinite(percentOverride) ? percentOverride : computedPercent));
  bar.style.width = `${percent}%`;
  text.textContent = `${current} / ${total} (${percent.toFixed(0)}%)`;
}

export function setUploadProgressView(loaded, total) {
  setUploadProgressVisible(true);
  setUploadTileUploading({ uploading: true });
  setUploadActionSlotVisible(false);
  const hasNumbers = Number.isFinite(loaded) && Number.isFinite(total) && total > 0;
  if (hasNumbers) {
    const percent = Math.max(0, Math.min(100, (loaded / total) * 100));
    setUploadProgressFill({ percent, text: `上传中 ${percent.toFixed(0)}%` });
    return;
  }
  setUploadProgressFill({ percent: 18, text: "上传中" });
}

export function resetUploadProgressView() {
  setUploadProgressVisible(false);
  setUploadTileUploading({ uploading: false });
  setUploadProgressFill({ percent: 0, text: "上传中" });
}

export function clearFileInputValueView() {
  const input = $("file");
  if (input) {
    input.value = "";
  }
}

export function resetUploadedFileView() {
  const submitButton = $("submit-btn");
  if (submitButton) {
    submitButton.disabled = true;
  }
  resetUploadTileView({ defaultFileLabel: DEFAULT_FILE_LABEL });
}
