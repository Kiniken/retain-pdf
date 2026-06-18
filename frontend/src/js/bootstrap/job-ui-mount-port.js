import {
  createJobUiJobActionsPort,
} from "./job-ui-job-actions-port.js";
import {
  createJobUiPresentationPort,
} from "./job-ui-presentation-port.js";
import {
  createJobUiTextPort,
} from "./job-ui-text-port.js";

export function createJobUiMountPort(overrides = {}) {
  const jobActionsPort = createJobUiJobActionsPort(overrides.jobActionsPort);
  const presentationPort = createJobUiPresentationPort(overrides.presentationPort);
  const textPort = createJobUiTextPort(overrides.textPort);

  return Object.freeze({
    ...presentationPort,
    ...jobActionsPort,
    ...textPort,
    jobActionsPort,
    presentationPort,
    textPort,
    ...overrides,
  });
}
