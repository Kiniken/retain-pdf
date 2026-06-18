import { mountAppActionsFeature } from "../features/app-actions/controller.js";

export function createCredentialAppActionsFeatureControllerPort(overrides = {}) {
  return Object.freeze({
    mountAppActionsFeature,
    ...overrides,
  });
}
