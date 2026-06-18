import {
  applyDefaultCredentialInputs,
} from "../features/credentials/default-state-port.js";

export function createConfigBootstrapCredentialsPort(overrides = {}) {
  return Object.freeze({
    applyHiddenCredentialInputs: applyDefaultCredentialInputs,
    ...overrides,
  });
}
