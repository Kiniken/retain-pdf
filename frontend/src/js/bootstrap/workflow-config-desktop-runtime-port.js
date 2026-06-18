import { isDesktopMode as isDesktopModeState } from "../state/desktop-state.js";

export function createWorkflowConfigDesktopRuntimePort(overrides = {}) {
  return Object.freeze({
    isDesktopMode: isDesktopModeState,
    ...overrides,
  });
}
