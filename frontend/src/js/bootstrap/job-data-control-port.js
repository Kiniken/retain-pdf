import {
  rerunJob,
  retryJobStage,
} from "../api/jobs-actions.js";

export function createJobDataControlPort(overrides = {}) {
  return Object.freeze({
    rerunJob,
    retryJobStage,
    ...overrides,
  });
}
