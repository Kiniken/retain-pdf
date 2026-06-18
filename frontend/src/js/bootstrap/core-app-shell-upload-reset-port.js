import {
  resetUploadProgress,
  resetUploadedFile,
} from "../ui/job-actions.js";

export function createCoreAppShellUploadResetPort(overrides = {}) {
  return Object.freeze({
    resetUploadProgress,
    resetUploadedFile,
    ...overrides,
  });
}
