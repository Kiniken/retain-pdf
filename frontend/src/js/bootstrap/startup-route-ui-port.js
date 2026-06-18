import { setText } from "../ui/text.js";

export function createStartupRouteUiPort(overrides = {}) {
  return Object.freeze({
    setText,
    ...overrides,
  });
}
