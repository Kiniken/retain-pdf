import { bindReaderDialogEvents } from "./reader-dialog-events.js";
import {
  closeReaderDialog,
  getReaderDialogToolbarButtonUrl,
  openReaderDialog,
  readerDialogElements,
  restoreReaderDialogButton,
  setReaderDialogFrameSource,
  setReaderDialogButtonBusy,
  setReaderDialogLoadingProgress,
  setReaderDialogLoadingVisible,
  setReaderDialogToolbarButtonState,
} from "./reader-dialog-rendering.js";
import { readerDialogTemplate } from "./reader-dialog-template.js";
import {
  READER_DIALOG_DATASETS,
  READER_DIALOG_DATASET_VALUES,
  READER_DIALOG_ELEMENT,
} from "./reader-dialog-contract.js";

class ReaderDialog extends HTMLElement {
  connectedCallback() {
    if (this.dataset[READER_DIALOG_DATASETS.hydrated] === READER_DIALOG_DATASET_VALUES.hydrated) {
      return;
    }
    this.dataset[READER_DIALOG_DATASETS.hydrated] = READER_DIALOG_DATASET_VALUES.hydrated;
    this.innerHTML = readerDialogTemplate();
  }

  dialogElement() {
    return readerDialogElements(this).dialog;
  }

  frameElement() {
    return readerDialogElements(this).frame;
  }

  setLoadingVisible(loading) {
    setReaderDialogLoadingVisible(this, loading);
  }

  setLoadingProgress({ text = "正在准备对照阅读…", percent = 0, widthPercent = null } = {}) {
    setReaderDialogLoadingProgress(this, { text, percent, widthPercent });
  }

  setToolbarButtonState(id, { enabled = false, url = "" } = {}) {
    setReaderDialogToolbarButtonState(this, id, { enabled, url });
  }

  getToolbarButtonUrl(id) {
    return getReaderDialogToolbarButtonUrl(this, id);
  }

  setButtonBusy(id, busy, label = "生成中…") {
    return setReaderDialogButtonBusy(this, id, busy, label);
  }

  restoreButton(id, markup) {
    restoreReaderDialogButton(this, id, markup);
  }

  setFrameSource(url = "about:blank") {
    setReaderDialogFrameSource(this, url);
  }

  open() {
    openReaderDialog(this);
  }

  close() {
    closeReaderDialog(this);
  }

  getFrameWindow() {
    return this.frameElement()?.contentWindow || null;
  }

  hasLoadedFrame() {
    const frame = this.frameElement();
    return Boolean(frame?.src && frame.src !== "about:blank");
  }

  bindEvents(options = {}) {
    bindReaderDialogEvents(this, options);
  }
}

if (!customElements.get(READER_DIALOG_ELEMENT.tagName)) {
  customElements.define(READER_DIALOG_ELEMENT.tagName, ReaderDialog);
}
