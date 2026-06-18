import { setText } from "../ui/text.js";

export function createJobUiTextPort(overrides = {}) {
  return Object.freeze({
    setText,
    ...overrides,
  });
}
