import {
  resetUploadProgress,
  resetUploadedFile,
} from "../ui/job-actions.js";

export function createJobUiJobActionsPort(overrides = {}) {
  return Object.freeze({
    resetUploadProgress,
    resetUploadedFile,
    ...overrides,
  });
}
