import {
  READER_DIALOG_COPY,
  READER_DIALOG_CLASSES,
  READER_DIALOG_DATASETS,
  READER_DIALOG_IDS,
  READER_FRAME_PLACEHOLDER,
} from "./reader-dialog-contract.js";

export function readerDialogElements(host) {
  return {
    dialog: host.querySelector(`#${READER_DIALOG_IDS.dialog}`),
    frame: host.querySelector(`#${READER_DIALOG_IDS.frame}`),
    loading: host.querySelector(`#${READER_DIALOG_IDS.loading}`),
    loadingText: host.querySelector(`#${READER_DIALOG_IDS.loadingText}`),
    loadingPercent: host.querySelector(`#${READER_DIALOG_IDS.loadingPercent}`),
    loadingBar: host.querySelector(`#${READER_DIALOG_IDS.loadingBar}`),
  };
}

export function setReaderDialogLoadingVisible(host, loading) {
  readerDialogElements(host).loading?.classList.toggle(READER_DIALOG_CLASSES.hidden, !loading);
}

export function setReaderDialogLoadingProgress(host, {
  text = READER_DIALOG_COPY.preparing,
  percent = 0,
  widthPercent = null,
} = {}) {
  const { loadingText, loadingPercent, loadingBar } = readerDialogElements(host);
  const hasWidthPercent = widthPercent !== null && widthPercent !== undefined;
  const safePercent = Math.max(0, Math.min(100, Number(hasWidthPercent ? widthPercent : percent) || 0));
  if (loadingText) {
    loadingText.textContent = text;
  }
  if (loadingPercent) {
    loadingPercent.textContent = `${safePercent.toFixed(0)}%`;
  }
  if (loadingBar) {
    loadingBar.style.width = `${safePercent}%`;
  }
}

export function setReaderDialogToolbarButtonState(host, id, { enabled = false, url = "" } = {}) {
  const button = host.querySelector(`#${id}`);
  if (!button) {
    return;
  }
  button.disabled = !enabled;
  button.dataset[READER_DIALOG_DATASETS.url] = enabled ? url : "";
  button.setAttribute("aria-disabled", enabled ? "false" : "true");
}

export function getReaderDialogToolbarButtonUrl(host, id) {
  return `${host.querySelector(`#${id}`)?.dataset?.[READER_DIALOG_DATASETS.url] || ""}`.trim();
}

export function setReaderDialogButtonBusy(host, id, busy, label = READER_DIALOG_COPY.busyGenerating) {
  const button = host.querySelector(`#${id}`);
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

export function restoreReaderDialogButton(host, id, markup) {
  const button = host.querySelector(`#${id}`);
  if (button && typeof markup === "string") {
    button.innerHTML = markup;
  }
}

export function setReaderDialogFrameSource(host, url = "about:blank") {
  const { frame } = readerDialogElements(host);
  if (frame) {
    const normalizedUrl = `${url || ""}`.trim();
    if (!normalizedUrl || normalizedUrl === "about:blank") {
      frame.removeAttribute("src");
      frame.setAttribute("srcdoc", READER_FRAME_PLACEHOLDER);
      return;
    }
    frame.removeAttribute("srcdoc");
    frame.src = normalizedUrl;
  }
}

export function openReaderDialog(host) {
  readerDialogElements(host).dialog?.showModal();
}

export function closeReaderDialog(host) {
  readerDialogElements(host).dialog?.close();
}
