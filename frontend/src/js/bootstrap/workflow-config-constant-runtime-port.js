import { workflowConstants } from "./workflow-constants.js";

export function createWorkflowConfigConstantRuntimePort(overrides = {}) {
  return Object.freeze({
    constants: workflowConstants(),
    ...overrides,
  });
}
