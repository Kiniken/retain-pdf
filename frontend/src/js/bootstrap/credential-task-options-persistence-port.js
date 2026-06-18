import {
  savePersistedDeveloperStoredConfig,
} from "../config/persisted-config.js";

export function createCredentialTaskOptionsPersistencePort(overrides = {}) {
  return Object.freeze({
    persistDeveloperConfig: savePersistedDeveloperStoredConfig,
    ...overrides,
  });
}
