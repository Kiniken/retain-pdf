import {
  isJobTerminal,
  isTerminalStatus,
} from "../job/core.js";
import { summarizeStatus } from "../job/diagnostics.js";
import { normalizeJobPayload } from "../job/normalize.js";
import { buildJobPatchWithDisplayState } from "../job-status/job-display-state.js";

export function createJobRuntimeJobPresentationPort(overrides = {}) {
  return Object.freeze({
    buildJobPatchWithDisplayState,
    isJobTerminal,
    isTerminalStatus,
    normalizeJobPayload,
    summarizeStatus,
    ...overrides,
  });
}
