import {
  setWorkflowSections,
  updateJobWarning,
} from "../ui/presentation.js";

export function createJobUiWorkflowPresentationPort(overrides = {}) {
  return Object.freeze({
    setWorkflowSections,
    updateJobWarning,
    ...overrides,
  });
}
