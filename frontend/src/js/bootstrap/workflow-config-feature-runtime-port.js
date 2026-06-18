import { defaultWorkflowConfigPort } from "../features/workflow/config-port.js";

export function createWorkflowConfigFeatureRuntimePort(overrides = {}) {
  return Object.freeze({
    workflowConfigPort: defaultWorkflowConfigPort,
    ...overrides,
  });
}
