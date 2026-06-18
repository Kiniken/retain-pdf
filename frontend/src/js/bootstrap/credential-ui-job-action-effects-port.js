import { resetUploadedFile } from "../ui/job-actions.js";

export function createCredentialUiJobActionEffectsPort(overrides = {}) {
  return Object.freeze({
    resetUploadedFile,
    ...overrides,
  });
}
