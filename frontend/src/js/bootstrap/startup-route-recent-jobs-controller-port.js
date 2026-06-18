import { mountRecentJobsFeature } from "../features/recent-jobs/controller.js";

export function createStartupRouteRecentJobsControllerPort(overrides = {}) {
  return Object.freeze({
    mountRecentJobsFeature,
    ...overrides,
  });
}
