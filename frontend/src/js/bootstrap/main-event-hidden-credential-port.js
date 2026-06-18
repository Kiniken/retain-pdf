import {
  bindDefaultHiddenCredentialInputPersistence,
} from "../features/credentials/default-state-port.js";

export function createMainEventHiddenCredentialPort(overrides = {}) {
  return Object.freeze({
    bindCredentialPersistence: bindDefaultHiddenCredentialInputPersistence,
    ...overrides,
  });
}
