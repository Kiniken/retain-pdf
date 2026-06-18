import { setText } from "../ui/text.js";

export function createAppInitializerUiPort(overrides = {}) {
  return Object.freeze({
    setText,
    ...overrides,
  });
}
