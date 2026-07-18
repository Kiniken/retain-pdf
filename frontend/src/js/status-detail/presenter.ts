import {
  buildStatusDetailSnapshot,
  type StatusDetailSnapshotOptions,
} from "./snapshot.js";
import type { JobLike, JobPayload } from "../job/types.js";

export type StatusDetailSnapshot = ReturnType<typeof buildStatusDetailSnapshot>;

export interface StatusDetailPresenterOptions {
  renderSnapshotView?: (snapshot: StatusDetailSnapshot) => boolean;
  renderSnapshotSections?: (snapshot: StatusDetailSnapshot) => void;
}

export function createStatusDetailPresenter({
  renderSnapshotView = () => false,
  renderSnapshotSections = () => {},
}: StatusDetailPresenterOptions = {}) {
  function renderSnapshot(snapshot: StatusDetailSnapshot) {
    if (!renderSnapshotView(snapshot)) {
      renderSnapshotSections(snapshot);
    }
  }

  function renderDetails(
    job: JobLike | JobPayload | null | undefined,
    events: unknown,
    options: StatusDetailSnapshotOptions = {},
  ) {
    const snapshot = buildStatusDetailSnapshot(job, events, options);
    renderSnapshot(snapshot);
    return snapshot;
  }

  return Object.freeze({
    renderDetails,
    renderSnapshot,
  });
}
