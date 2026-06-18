import { state } from "../state/store.js";

export function createJobLegacyStateMountPort(overrides = {}) {
  return Object.freeze({
    state,
    ...overrides,
  });
}
