import {
  createCredentialUiJobActionEffectsPort,
} from "./credential-ui-job-action-effects-port.js";
import {
  createCredentialUiPresentationPort,
} from "./credential-ui-presentation-port.js";

export function createCredentialUiJobActionsPort(overrides = {}) {
  const jobActionEffectsPort = createCredentialUiJobActionEffectsPort(overrides.jobActionEffectsPort);
  const presentationPort = createCredentialUiPresentationPort(overrides.presentationPort);

  return Object.freeze({
    ...presentationPort,
    ...jobActionEffectsPort,
    jobActionEffectsPort,
    presentationPort,
    ...overrides,
  });
}
