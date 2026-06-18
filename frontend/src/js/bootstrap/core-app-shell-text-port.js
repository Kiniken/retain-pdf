import { setText } from "../ui/text.js";

export function createCoreAppShellTextPort(overrides = {}) {
  return Object.freeze({
    setText,
    ...overrides,
  });
}
