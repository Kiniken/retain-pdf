import { mountUploadFeature } from "../features/upload/controller.js";

export function createUploadFeatureControllerPort(overrides = {}) {
  return Object.freeze({
    mountUploadFeature,
    ...overrides,
  });
}
