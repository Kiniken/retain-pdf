import {
  applyDefaultCredentialInputs,
} from "../features/credentials/default-state-port.js";
import {
  readCredentialInputs,
} from "../features/credentials/selectors-port.js";

export function createCredentialUiHiddenPort(overrides = {}) {
  return Object.freeze({
    applyHiddenCredentialInputs: applyDefaultCredentialInputs,
    readHiddenCredentialInputs: readCredentialInputs,
    ...overrides,
  });
}
