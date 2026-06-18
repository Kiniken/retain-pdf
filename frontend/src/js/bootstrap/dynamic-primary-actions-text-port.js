import { setText } from "../ui/text.js";

export function createDynamicPrimaryActionsTextPort(overrides = {}) {
  return Object.freeze({
    setText,
    ...overrides,
  });
}
