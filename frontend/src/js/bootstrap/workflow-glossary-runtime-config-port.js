import { API_PREFIX } from "../config/api-constants.js";

export function createWorkflowGlossaryRuntimeConfigPort(overrides = {}) {
  return Object.freeze({
    apiPrefix: API_PREFIX,
    ...overrides,
  });
}
