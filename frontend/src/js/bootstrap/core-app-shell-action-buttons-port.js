import { updateActionButtons } from "../ui/job-actions.js";

export function createCoreAppShellActionButtonsPort(overrides = {}) {
  return Object.freeze({
    updateActionButtons,
    ...overrides,
  });
}
