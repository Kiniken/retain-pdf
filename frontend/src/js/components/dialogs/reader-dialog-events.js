import {
  READER_DIALOG_BUTTON_IDS,
  READER_DIALOG_IDS,
} from "./reader-dialog-contract.js";

function closeDownloadMenuFromButton(button) {
  const menu = button?.closest?.(".reader-dialog-download-menu");
  if (menu) {
    menu.open = false;
  }
}

export function bindReaderDialogEvents(host, {
  onClose,
  onFrameLoad,
  onSourceDownload,
  onMergedDownload,
  onTranslatedDownload,
} = {}) {
  if (host.__retainPdfReaderDialogEventsBound) {
    host.__retainPdfReaderDialogHandlers = {
      onClose,
      onFrameLoad,
      onSourceDownload,
      onMergedDownload,
      onTranslatedDownload,
    };
    return;
  }
  host.__retainPdfReaderDialogEventsBound = true;
  host.__retainPdfReaderDialogHandlers = {
    onClose,
    onFrameLoad,
    onSourceDownload,
    onMergedDownload,
    onTranslatedDownload,
  };
  const handlers = () => host.__retainPdfReaderDialogHandlers || {};
  host.querySelector(`#${READER_DIALOG_BUTTON_IDS.source}`)?.addEventListener("click", (event) => {
    closeDownloadMenuFromButton(event.currentTarget);
    handlers().onSourceDownload?.();
  });
  host.querySelector(`#${READER_DIALOG_BUTTON_IDS.merged}`)?.addEventListener("click", (event) => {
    closeDownloadMenuFromButton(event.currentTarget);
    handlers().onMergedDownload?.();
  });
  host.querySelector(`#${READER_DIALOG_BUTTON_IDS.translated}`)?.addEventListener("click", (event) => {
    closeDownloadMenuFromButton(event.currentTarget);
    handlers().onTranslatedDownload?.();
  });
  host.querySelector(`#${READER_DIALOG_IDS.closeButton}`)?.addEventListener("click", () => handlers().onClose?.());
  host.querySelector(`#${READER_DIALOG_IDS.frame}`)?.addEventListener("load", () => handlers().onFrameLoad?.());
}
