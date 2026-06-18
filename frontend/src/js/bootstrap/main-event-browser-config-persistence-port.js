import { saveBrowserStoredConfig } from "../config/persisted-config.js";

export function createMainEventBrowserConfigPersistencePort(overrides = {}) {
  return Object.freeze({
    saveBrowserConfig: saveBrowserStoredConfig,
    ...overrides,
  });
}
