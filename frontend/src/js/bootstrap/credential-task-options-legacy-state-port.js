import { state } from "../state/store.js";

export function createCredentialTaskOptionsLegacyStatePort(overrides = {}) {
  return Object.freeze({
    legacyState: state,
    ...overrides,
  });
}
