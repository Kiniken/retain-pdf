import {
  setWorkflowSections,
  updateJobWarning,
} from "../ui/presentation.js";

export function createCorePresentationMountPort(overrides = {}) {
  return Object.freeze({
    setWorkflowSections,
    updateJobWarning,
    ...overrides,
  });
}
