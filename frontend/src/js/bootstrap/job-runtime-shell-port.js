import {
  defaultJobRuntimeShellViewPort,
} from "../ui/default-job-runtime-shell-view-port.js";

export function createJobRuntimeShellPort(overrides = {}) {
  return Object.freeze({
    shellViewPort: defaultJobRuntimeShellViewPort,
    ...overrides,
  });
}
