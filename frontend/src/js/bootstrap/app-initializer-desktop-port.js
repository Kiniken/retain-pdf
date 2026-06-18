import { bootstrapDesktop } from "../desktop/index.js";

export function createAppInitializerDesktopPort(overrides = {}) {
  return Object.freeze({
    bootstrapDesktop,
    ...overrides,
  });
}
