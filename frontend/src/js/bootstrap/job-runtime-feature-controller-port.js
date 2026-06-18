import { mountJobRuntimeFeature } from "../features/job-runtime/controller.js";

export function createJobRuntimeFeatureControllerPort(overrides = {}) {
  return Object.freeze({
    mountJobRuntimeFeature,
    ...overrides,
  });
}
