import { isMockMode } from "../../config/runtime.js";

export function createAppShellConfigPort({
  isMock = isMockMode,
} = {}) {
  return {
    isMock,
  };
}

export const defaultAppShellConfigPort = createAppShellConfigPort();
