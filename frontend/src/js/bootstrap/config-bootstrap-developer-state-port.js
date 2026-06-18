import { setDeveloperConfig } from "../state/actions.js";

export function createConfigBootstrapDeveloperStatePort(overrides = {}) {
  return Object.freeze({
    setDeveloperConfig,
    ...overrides,
  });
}
