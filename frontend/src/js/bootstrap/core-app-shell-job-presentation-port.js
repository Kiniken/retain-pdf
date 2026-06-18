import { summarizeStatus } from "../job/diagnostics.js";
import { normalizeJobPayload } from "../job/normalize.js";

export function createCoreAppShellJobPresentationPort(overrides = {}) {
  return Object.freeze({
    normalizeJobPayload,
    summarizeStatus,
    ...overrides,
  });
}
