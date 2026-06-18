import {
  syncCurrentJobSnapshot,
} from "../features/job-runtime/current-job-state.js";

export function createStartupRouteCurrentJobPort(targetState, overrides = {}) {
  return Object.freeze({
    syncCurrentJobSnapshot: (payload, jobId, meta) => syncCurrentJobSnapshot(targetState, payload, jobId, meta),
    ...overrides,
  });
}
