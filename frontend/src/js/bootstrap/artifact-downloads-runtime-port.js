import {
  currentJobId,
} from "../features/job-runtime/current-job-state.js";
import {
  createArtifactDownloadsRuntimePort,
} from "../features/artifact-downloads/runtime-port.js";

export function createDefaultArtifactDownloadsRuntimePort(overrides = {}) {
  return createArtifactDownloadsRuntimePort({
    currentJobId,
    ...overrides,
  });
}
