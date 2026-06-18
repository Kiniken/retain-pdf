import { createRecentJobsReaderPort } from "../features/recent-jobs/reader-port.js";

export function createStartupRouteRecentJobsReaderPort(overrides = {}) {
  return Object.freeze({
    createRecentJobsReaderPort,
    ...overrides,
  });
}
