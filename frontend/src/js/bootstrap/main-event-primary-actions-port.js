import { bindDynamicPrimaryActions } from "./dynamic-primary-actions.js";

export function createMainEventPrimaryActionsPort(overrides = {}) {
  const {
    bindPrimaryActions = bindDynamicPrimaryActions,
  } = overrides;

  return Object.freeze({
    bindPrimaryActions,
    ...overrides,
  });
}
