import {
  validateMineruToken,
  validatePaddleToken,
} from "../api/providers.js";

export function createCredentialProviderOcrDataPort(overrides = {}) {
  return Object.freeze({
    validateMineruToken,
    validatePaddleToken,
    ...overrides,
  });
}
