import {
  queryDeepSeekBalance,
  validateDeepSeekToken,
} from "../api/providers.js";

export function createCredentialProviderDeepSeekDataPort(overrides = {}) {
  return Object.freeze({
    queryDeepSeekBalance,
    validateDeepSeekToken,
    ...overrides,
  });
}
