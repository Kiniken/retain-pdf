import {
  resetDeveloperConfig,
  setDeveloperConfig,
} from "../state/actions.js";
import { getDeveloperConfig } from "../state/developer-state.js";

export function createWorkflowConfigDeveloperStatePort(overrides = {}) {
  return Object.freeze({
    getDeveloperConfig,
    resetDeveloperConfig,
    setDeveloperConfig,
    ...overrides,
  });
}
