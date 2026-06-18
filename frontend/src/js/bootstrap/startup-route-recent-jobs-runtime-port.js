import { createRecentJobsRuntimePort } from "../features/recent-jobs/job-runtime-port.js";

export function createStartupRouteRecentJobsRuntimePort(overrides = {}) {
  return Object.freeze({
    createRecentJobsRuntimePort,
    ...overrides,
  });
}
