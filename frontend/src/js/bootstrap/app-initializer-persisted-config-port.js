import { loadPersistedConfig } from "../config/desktop-persistence.js";

export function createAppInitializerPersistedConfigPort(overrides = {}) {
  return Object.freeze({
    loadPersistedConfig,
    ...overrides,
  });
}
