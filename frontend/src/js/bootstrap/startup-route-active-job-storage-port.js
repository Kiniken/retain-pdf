import { readActiveJobId } from "../features/job-runtime/active-job-storage.js";

export function createStartupRouteActiveJobStoragePort(overrides = {}) {
  return Object.freeze({
    activeJobRecoveryPort: {
      readActiveJobId,
    },
    ...overrides,
  });
}
