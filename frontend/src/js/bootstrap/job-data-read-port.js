import {
  fetchJobArtifactsManifest,
} from "../api/jobs-artifacts.js";
import {
  fetchJobPayload,
} from "../api/jobs-query.js";

export function createJobDataReadPort(overrides = {}) {
  return Object.freeze({
    fetchJobArtifactsManifest,
    fetchJobPayload,
    ...overrides,
  });
}
