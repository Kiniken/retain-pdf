import {
  defaultModelApiKey,
  defaultModelBaseUrl,
  defaultModelName,
} from "../config/runtime.js";

export function createWorkflowConfigModelDefaultsPort(overrides = {}) {
  return Object.freeze({
    defaultModelApiKey,
    defaultModelBaseUrl,
    defaultModelName,
    ...overrides,
  });
}
