import { mountWorkflowFeature } from "../features/workflow/controller.js";

export function createWorkflowFeatureControllerPort(overrides = {}) {
  return Object.freeze({
    mountWorkflowFeature,
    ...overrides,
  });
}
