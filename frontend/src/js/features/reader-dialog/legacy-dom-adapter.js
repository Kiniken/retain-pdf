import { $ } from "../../dom/query.js";
import {
  READER_DIALOG_BUTTON_IDS,
  READER_DIALOG_CLASSES,
  READER_DIALOG_DATASETS,
  READER_DIALOG_IDS,
  READER_FRAME_PLACEHOLDER,
} from "./contract.js";

function readerDialogElement(id) {
  return $(id);
}

export function hasLegacyReaderProgressTarget() {
  return Boolean(
    readerDialogElement(READER_DIALOG_IDS.loadingBar)
      || readerDialogElement(READER_DIALOG_IDS.loadingPercent),
  );
}

export function setLegacyReaderProgressWidth(value) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const barEl = readerDialogElement(READER_DIALOG_IDS.loadingBar);
  const percentEl = readerDialogElement(READER_DIALOG_IDS.loadingPercent);
  if (barEl) {
    barEl.style.width = `${safeValue}%`;
  }
  if (percentEl) {
    percentEl.textContent = `${safeValue.toFixed(0)}%`;
  }
  return Boolean(barEl || percentEl);
}

export function setLegacyReaderToolbarButtonState(id, enabled, url = "") {
  const button = readerDialogElement(id);
  if (!button) {
    return;
  }
  button.disabled = !enabled;
  button.dataset[READER_DIALOG_DATASETS.url] = enabled ? url : "";
}

export function getLegacyReaderToolbarButtonUrl(id) {
  return `${readerDialogElement(id)?.dataset?.[READER_DIALOG_DATASETS.url] || ""}`.trim();
}

export function setLegacyReaderLoadingVisible(loading) {
  readerDialogElement(READER_DIALOG_IDS.loading)?.classList.toggle(READER_DIALOG_CLASSES.hidden, !loading);
}

export function setLegacyReaderLoadingText(text) {
  const textEl = readerDialogElement(READER_DIALOG_IDS.loadingText);
  if (textEl) {
    textEl.textContent = text;
  }
}

export function setLegacyReaderFrameSource(url = "about:blank") {
  const frame = readerDialogElement(READER_DIALOG_IDS.frame);
  if (!frame) {
    return;
  }
  const normalizedUrl = `${url || ""}`.trim();
  if (!normalizedUrl || normalizedUrl === "about:blank") {
    frame.removeAttribute("src");
    frame.setAttribute("srcdoc", READER_FRAME_PLACEHOLDER);
    return;
  }
  frame.removeAttribute("srcdoc");
  frame.src = normalizedUrl;
}

export function openLegacyReaderDialog() {
  readerDialogElement(READER_DIALOG_IDS.dialog)?.showModal();
}

export function closeLegacyReaderDialog() {
  readerDialogElement(READER_DIALOG_IDS.dialog)?.close();
}

export function getLegacyReaderFrameWindow() {
  return readerDialogElement(READER_DIALOG_IDS.frame)?.contentWindow || null;
}

export function hasLegacyLoadedReaderFrame() {
  const frame = readerDialogElement(READER_DIALOG_IDS.frame);
  return Boolean(frame?.src && frame.src !== "about:blank");
}

export function setLegacyReaderButtonBusy(id, busy, label) {
  const button = readerDialogElement(id);
  if (!button) {
    return "";
  }
  const previousMarkup = button.innerHTML;
  if (!button.dataset[READER_DIALOG_DATASETS.defaultMarkup]) {
    button.dataset[READER_DIALOG_DATASETS.defaultMarkup] = previousMarkup;
  }
  if (busy) {
    button.disabled = true;
    button.innerHTML = `<span>${label}</span>`;
  } else {
    button.innerHTML = button.dataset[READER_DIALOG_DATASETS.defaultMarkup] || previousMarkup;
  }
  return previousMarkup;
}

export function restoreLegacyReaderButton(id, markup) {
  const button = readerDialogElement(id);
  if (button && typeof markup === "string") {
    button.innerHTML = markup;
  }
}

export function bindLegacyReaderDialogEvents({
  onClose,
  onFrameLoad,
  onSourceDownload,
  onMergedDownload,
  onTranslatedDownload,
} = {}) {
  readerDialogElement(READER_DIALOG_BUTTON_IDS.source)?.addEventListener("click", () => onSourceDownload?.());
  readerDialogElement(READER_DIALOG_BUTTON_IDS.merged)?.addEventListener("click", () => onMergedDownload?.());
  readerDialogElement(READER_DIALOG_BUTTON_IDS.translated)?.addEventListener("click", () => onTranslatedDownload?.());
  readerDialogElement(READER_DIALOG_IDS.closeButton)?.addEventListener("click", () => onClose?.());
  readerDialogElement(READER_DIALOG_IDS.frame)?.addEventListener("load", () => onFrameLoad?.());
}
