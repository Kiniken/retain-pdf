import { state } from "../state/store.js";

export function createAppInitializerLegacyStatePort(overrides = {}) {
  return Object.freeze({
    state,
    ...overrides,
  });
}
