import { mountApplicationFeatures } from "./feature-registry.js";

export function createAppInitializerFeaturePort(overrides = {}) {
  return Object.freeze({
    mountApplicationFeatures,
    ...overrides,
  });
}
