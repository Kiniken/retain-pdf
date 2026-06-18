import { apiBase, isMockMode } from "../../config/runtime.js";

export function createAppActionsConfigPort({
  resolveApiBase = apiBase,
  isMock = isMockMode,
} = {}) {
  function apiBaseLabel() {
    return resolveApiBase();
  }

  return Object.freeze({
    apiBaseLabel,
    isMock,
  });
}

export const defaultAppActionsConfigPort = createAppActionsConfigPort();
