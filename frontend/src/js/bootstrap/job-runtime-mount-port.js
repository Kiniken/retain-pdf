import {
  createJobRuntimeConfigPort,
} from "./job-runtime-config-port.js";
import {
  createJobRuntimeShellPort,
} from "./job-runtime-shell-port.js";

export function createJobRuntimeMountPort(overrides = {}) {
  const configPort = createJobRuntimeConfigPort(overrides.configPort);
  const shellPort = createJobRuntimeShellPort(overrides.shellPort);

  return Object.freeze({
    ...configPort,
    ...shellPort,
    configPort,
    shellPort,
    ...overrides,
  });
}
