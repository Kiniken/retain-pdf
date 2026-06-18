import { isDesktopMode } from "../config/desktop-persistence.js";

export function createAppInitializerEnvironmentPort(overrides = {}) {
  return Object.freeze({
    desktopMode: isDesktopMode,
    ...overrides,
  });
}
