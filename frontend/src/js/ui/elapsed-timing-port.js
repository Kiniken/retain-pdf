import {
  currentJobFinishedAt,
  currentJobSnapshot,
} from "../features/job-runtime/current-job-state.js";
import {
  startElapsedTimer,
  stopElapsedTimer,
} from "../features/job-runtime/runtime-timers.js";

export function createElapsedTimingPort({
  getFinishedAt = currentJobFinishedAt,
  getSnapshot = currentJobSnapshot,
  startTimer = startElapsedTimer,
  stopTimer = stopElapsedTimer,
} = {}) {
  return Object.freeze({
    finishedAt: (state) => getFinishedAt(state),
    snapshot: (state) => getSnapshot(state),
    start: (state, callback, intervalMs) => startTimer(state, callback, intervalMs),
    stop: (state) => stopTimer(state),
  });
}

export const defaultElapsedTimingPort = createElapsedTimingPort();
