import { setText } from "../ui/text.js";

export function createBindFeatureEventsUiPort(overrides = {}) {
  return Object.freeze({
    setText,
    ...overrides,
  });
}
