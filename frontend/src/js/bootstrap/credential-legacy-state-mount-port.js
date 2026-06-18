import { state } from "../state/store.js";

export function createCredentialLegacyStateMountPort(overrides = {}) {
  return Object.freeze({
    state,
    ...overrides,
  });
}

