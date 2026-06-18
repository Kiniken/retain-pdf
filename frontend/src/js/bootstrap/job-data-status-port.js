import {
  fetchJobDiagnostics,
  fetchJobStageActions,
  fetchResumePlan,
} from "../api/jobs-actions.js";
import {
  fetchJobEvents,
} from "../api/jobs-events.js";

export function createJobDataStatusPort(overrides = {}) {
  return Object.freeze({
    fetchJobDiagnostics,
    fetchJobEvents,
    fetchJobStageActions,
    fetchResumePlan,
    ...overrides,
  });
}
