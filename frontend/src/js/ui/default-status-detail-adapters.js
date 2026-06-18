import { createStatusDetailPresenter } from "../status-detail/presenter.js";
import { buildStatusDetailSnapshot } from "../status-detail/snapshot.js";
import { createStatusDetailDialogViewPort } from "../features/status-detail/dialog-view-port.js";
import { createStatusDetailTranslationViewPort } from "../features/status-detail/translation-view-port.js";
import { renderStatusDetailSnapshotSections } from "../features/status-detail/view.js";
import { renderStatusDetailSnapshotView } from "./presentation-view.js";
import { defaultStatusDetailComponentPort } from "./status-detail-component-port.js";

export const defaultStatusDetailPresenter = createStatusDetailPresenter({
  renderSnapshotView: renderStatusDetailSnapshotView,
  renderSnapshotSections: renderStatusDetailSnapshotSections,
});

export function renderStatusDetails(job, events, options = {}) {
  return defaultStatusDetailPresenter.renderDetails(job, events, options);
}

export function renderStatusDetailSections(job, eventsPayload, options = {}) {
  const snapshot = buildStatusDetailSnapshot(job, eventsPayload, options);
  defaultStatusDetailPresenter.renderSnapshot(snapshot);
  return snapshot;
}

export const defaultStatusDetailDialogViewPort = createStatusDetailDialogViewPort({
  renderReplay: defaultStatusDetailComponentPort.renderReplay,
  renderSnapshot: defaultStatusDetailComponentPort.renderSnapshot,
});

export const defaultStatusDetailTranslationViewPort = createStatusDetailTranslationViewPort({
  renderItemDetail: defaultStatusDetailComponentPort.renderItemDetail,
  renderItems: defaultStatusDetailComponentPort.renderItems,
  renderReplay: defaultStatusDetailComponentPort.renderReplay,
  renderSummary: defaultStatusDetailComponentPort.renderSummary,
});
