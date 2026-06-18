import { adaptJobStageSnapshot } from "../job-status/job-stage-contract-adapter.js";

export function createStartupRouteRecentJobsStageAdapterPort(overrides = {}) {
  return Object.freeze({
    recentJobsStageAdapterPort: {
      adaptJobStageSnapshot,
      ...overrides.recentJobsStageAdapterPort,
    },
    ...overrides,
  });
}
