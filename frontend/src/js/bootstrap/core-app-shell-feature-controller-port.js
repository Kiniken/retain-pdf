import { mountAppShellFeature } from "../features/app-shell/controller.js";

export function createCoreAppShellFeatureControllerPort(overrides = {}) {
  return Object.freeze({
    mountAppShellFeature,
    ...overrides,
  });
}
