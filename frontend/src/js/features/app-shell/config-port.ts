import { isMockMode } from "../../config/runtime.js";

export function createAppShellConfigPort({
  isMock = isMockMode,
}: any = {}) {
  return {
    isMock,
  };
}

export const defaultAppShellConfigPort = createAppShellConfigPort();
