import { mountAppUpdateFeature } from "../features/app-update/controller.js";

export function createCoreAppUpdateFeatureControllerPort(overrides = {}) {
  return Object.freeze({
    mountAppUpdateFeature,
    ...overrides,
  });
}
