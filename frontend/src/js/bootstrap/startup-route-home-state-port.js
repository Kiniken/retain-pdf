import { createHomeStatePort } from "../features/home/state.js";
import { state } from "../state/store.js";

export function createStartupRouteHomeStatePort(overrides = {}) {
  return Object.freeze({
    createHomeStatePort: (targetState = state) => createHomeStatePort(targetState),
    ...overrides,
  });
}
