import { $ } from "../../dom/query.js";
import { APP_EVENTS } from "../../contracts/app-contract.js";

export function setSubmitBusy(busy) {
  document.dispatchEvent(new CustomEvent(APP_EVENTS.submitBusyChanged, {
    detail: { busy: !!busy },
  }));
  const button = $("submit-btn");
  if (button) {
    button.disabled = !!busy;
    button.dataset.busy = busy ? "1" : "0";
  }
}

export function resetMissingUploadState({ uploadStatePort, resetUploadedFile, setText }) {
  uploadStatePort?.reset?.({ includePageRange: false });
  resetUploadedFile?.();
  setText("error-box", "当前上传文件已失效，请重新上传 PDF 后再提交。");
}
