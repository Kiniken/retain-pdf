import { setText } from "../ui/text.js";

export function createWorkflowGlossaryUiPort(overrides = {}) {
  return Object.freeze({
    setText,
    ...overrides,
  });
}

