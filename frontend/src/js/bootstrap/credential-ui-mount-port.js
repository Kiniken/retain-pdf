import {
  createCredentialUiHiddenPort,
} from "./credential-ui-hidden-port.js";
import {
  createCredentialUiJobActionsPort,
} from "./credential-ui-job-actions-port.js";
import {
  createCredentialUiTextPort,
} from "./credential-ui-text-port.js";

export function createCredentialUiMountPort(overrides = {}) {
  const hiddenPort = createCredentialUiHiddenPort(overrides.hiddenPort);
  const jobActionsPort = createCredentialUiJobActionsPort(overrides.jobActionsPort);
  const textPort = createCredentialUiTextPort(overrides.textPort);

  return Object.freeze({
    ...hiddenPort,
    ...jobActionsPort,
    ...textPort,
    hiddenPort,
    jobActionsPort,
    textPort,
    ...overrides,
  });
}
