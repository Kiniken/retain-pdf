import { savePersistedDeveloperStoredConfig } from "../config/persisted-config.js";

export function createWorkflowConfigPersistencePort(overrides = {}) {
  return Object.freeze({
    saveDeveloperStoredConfig: savePersistedDeveloperStoredConfig,
    ...overrides,
  });
}
