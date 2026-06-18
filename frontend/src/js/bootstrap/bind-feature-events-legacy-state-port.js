import { state } from "../state/store.js";

export function createBindFeatureEventsLegacyStatePort(overrides = {}) {
  return Object.freeze({
    state,
    ...overrides,
  });
}
