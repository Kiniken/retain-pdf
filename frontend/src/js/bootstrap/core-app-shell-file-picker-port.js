import { prepareFilePicker } from "../ui/job-actions.js";

export function createCoreAppShellFilePickerPort(overrides = {}) {
  return Object.freeze({
    prepareFilePicker,
    ...overrides,
  });
}
