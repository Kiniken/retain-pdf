import { readWorkflowSubmitValues } from "../features/workflow/view.js";

export function createWorkflowSubmitValuesPort(overrides = {}) {
  return Object.freeze({
    readWorkflowSubmitValues,
    ...overrides,
  });
}
