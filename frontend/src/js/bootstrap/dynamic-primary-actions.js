import {
  defaultDynamicPrimaryActionsPort,
} from "./dynamic-primary-actions-port.js";

export function bindDynamicPrimaryActions({
  documentRef = typeof document === "undefined" ? null : document,
  fetchProtected,
  openReaderFromButtonFn,
  port = defaultDynamicPrimaryActionsPort,
  setTextFn,
  state,
  statusDetailFeature,
}) {
  const openReader = openReaderFromButtonFn || port.openReaderFromButton;
  const setText = setTextFn || port.setText;

  documentRef?.addEventListener?.("click", (event) => {
    const detailButton = event.target?.closest?.("#status-detail-btn");
    if (detailButton) {
      event.preventDefault();
      statusDetailFeature?.openStatusDetailDialog("overview");
      return;
    }

    const readerButton = event.target?.closest?.("#reader-btn");
    if (readerButton) {
      event.preventDefault();
      void openReader({
        button: readerButton,
        state,
        fetchProtected,
        setTextFn: setText,
      }).catch((error) => {
        setText("error-box", error.message || String(error));
      });
    }
  });
}
