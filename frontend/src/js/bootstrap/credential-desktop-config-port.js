import { openDesktopOutputDirectory } from "../config/desktop-persistence.js";

export function createCredentialDesktopConfigPort(overrides = {}) {
  return Object.freeze({
    openDesktopOutputDirectory,
    ...overrides,
  });
}
