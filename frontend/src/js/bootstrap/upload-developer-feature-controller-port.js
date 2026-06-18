import { mountDeveloperFeature } from "../features/developer/controller.js";

export function createUploadDeveloperFeatureControllerPort(overrides = {}) {
  return Object.freeze({
    mountDeveloperFeature,
    ...overrides,
  });
}
