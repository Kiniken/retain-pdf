import {
  createUploadRuntimeJobActionsPort,
} from "./upload-runtime-job-actions-port.js";

export function createUploadRuntimeUiPort(overrides = {}) {
  const jobActionsPort = createUploadRuntimeJobActionsPort(overrides.jobActionsPort);

  return Object.freeze({
    ...jobActionsPort,
    jobActionsPort,
    ...overrides,
  });
}
