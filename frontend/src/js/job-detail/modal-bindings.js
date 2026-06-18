import {
  bindDetailModalDismiss,
  closeAllDetailModals,
} from "./view.js";

export function bindJobDetailModals({
  onBeforeUnload,
  targetDocument = document,
  targetWindow = window,
} = {}) {
  if (typeof onBeforeUnload === "function") {
    targetWindow.addEventListener("beforeunload", onBeforeUnload, { once: true });
  }
  bindDetailModalDismiss("detail-stage-history-modal", "detail-close-stage-history-btn");
  bindDetailModalDismiss("detail-events-modal", "detail-close-events-btn");
  targetDocument.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    closeAllDetailModals();
  });
}
