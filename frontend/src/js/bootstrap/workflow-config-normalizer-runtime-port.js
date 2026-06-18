import {
  normalizeMathMode,
  normalizeWorkflow,
} from "./workflow-normalizers.js";

export function createWorkflowConfigNormalizerRuntimePort(overrides = {}) {
  return Object.freeze({
    normalizeMathMode,
    normalizeWorkflow,
    ...overrides,
  });
}
