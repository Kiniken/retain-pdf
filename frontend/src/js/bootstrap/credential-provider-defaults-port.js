import { DEFAULT_MODEL_VERSION } from "../config/model-constants.js";

export function createCredentialProviderDefaultsPort(overrides = {}) {
  return Object.freeze({
    defaultModelVersion: DEFAULT_MODEL_VERSION,
    ...overrides,
  });
}
