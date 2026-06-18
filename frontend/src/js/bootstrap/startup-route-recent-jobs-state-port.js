import { createRecentJobsStatePort } from "../features/recent-jobs/state.js";
import { state } from "../state/store.js";

export function createStartupRouteRecentJobsStatePort(overrides = {}) {
  return Object.freeze({
    createRecentJobsStatePort: (targetState = state) => createRecentJobsStatePort(targetState),
    ...overrides,
  });
}
