import { mountHomeFeature } from "../features/home/controller.js";

export function createCoreHomeFeatureControllerPort(overrides = {}) {
  return Object.freeze({
    mountHomeFeature,
    ...overrides,
  });
}
