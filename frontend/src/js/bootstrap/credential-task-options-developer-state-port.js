import { setDeveloperConfig } from "../state/actions.js";
import { getDeveloperConfig } from "../state/developer-state.js";

export function createCredentialTaskOptionsDeveloperStatePort(overrides = {}) {
  return Object.freeze({
    getDeveloperConfig,
    setDeveloperConfig,
    ...overrides,
  });
}
