import {
  createCredentialDesktopConfigPort,
} from "./credential-desktop-config-port.js";
import {
  createCredentialDesktopRuntimePort,
} from "./credential-desktop-runtime-port.js";

export function createCredentialDesktopMountPort(overrides = {}) {
  const configPort = createCredentialDesktopConfigPort(overrides.configPort);
  const runtimePort = createCredentialDesktopRuntimePort(overrides.runtimePort);

  return Object.freeze({
    ...configPort,
    ...runtimePort,
    configPort,
    runtimePort,
    ...overrides,
  });
}
