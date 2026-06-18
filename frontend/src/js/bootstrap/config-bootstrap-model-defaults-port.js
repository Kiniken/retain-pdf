import {
  defaultModelApiKey,
} from "../config/runtime.js";

export function createConfigBootstrapModelDefaultsPort(overrides = {}) {
  return Object.freeze({
    defaultModelApiKey,
    ...overrides,
  });
}
