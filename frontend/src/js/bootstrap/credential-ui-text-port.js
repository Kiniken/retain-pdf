import { setText } from "../ui/text.js";

export function createCredentialUiTextPort(overrides = {}) {
  return Object.freeze({
    setText,
    ...overrides,
  });
}

