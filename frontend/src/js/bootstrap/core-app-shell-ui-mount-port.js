import {
  createCoreAppShellJobActionsPort,
} from "./core-app-shell-job-actions-port.js";
import {
  createCoreAppShellJobPresentationPort,
} from "./core-app-shell-job-presentation-port.js";
import {
  createCoreAppShellTextPort,
} from "./core-app-shell-text-port.js";

export function createCoreAppShellUiMountPort(overrides = {}) {
  const jobActionsPort = createCoreAppShellJobActionsPort(overrides.jobActionsPort);
  const jobPresentationPort = createCoreAppShellJobPresentationPort(
    overrides.jobPresentationPort,
  );
  const textPort = createCoreAppShellTextPort(overrides.textPort);

  return Object.freeze({
    ...jobActionsPort,
    ...jobPresentationPort,
    ...textPort,
    jobActionsPort,
    jobPresentationPort,
    textPort,
    ...overrides,
  });
}
