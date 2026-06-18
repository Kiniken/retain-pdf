import { setLinearProgress } from "../ui/job-actions.js";

export function createCoreAppShellProgressPort(overrides = {}) {
  return Object.freeze({
    setLinearProgress,
    ...overrides,
  });
}
