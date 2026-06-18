import {
  openSetupDialog,
  saveDesktopConfig,
} from "../desktop/index.js";

export function createCredentialDesktopRuntimePort(overrides = {}) {
  return Object.freeze({
    openSetupDialog,
    saveDesktopConfig,
    ...overrides,
  });
}

