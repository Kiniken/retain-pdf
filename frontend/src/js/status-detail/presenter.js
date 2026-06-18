import {
  buildStatusDetailSnapshot,
} from "./snapshot.js";

export function createStatusDetailPresenter({
  renderSnapshotView = () => false,
  renderSnapshotSections = () => {},
} = {}) {
  function renderSnapshot(snapshot) {
    if (!renderSnapshotView(snapshot)) {
      renderSnapshotSections(snapshot);
    }
  }

  function renderDetails(job, events, options = {}) {
    const snapshot = buildStatusDetailSnapshot(job, events, options);
    renderSnapshot(snapshot);
    return snapshot;
  }

  return Object.freeze({
    renderDetails,
    renderSnapshot,
  });
}
