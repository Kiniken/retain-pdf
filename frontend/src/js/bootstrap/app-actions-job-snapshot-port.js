import { syncCurrentJobSnapshot } from "../features/job-runtime/current-job-state.js";

export function createAppActionsJobSnapshotPort(targetState) {
  return Object.freeze({
    syncCurrentJobSnapshot: (payload, jobId, meta) => syncCurrentJobSnapshot(targetState, payload, jobId, meta),
  });
}
