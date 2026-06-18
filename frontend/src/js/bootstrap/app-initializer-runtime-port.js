import {
  createAppInitializerConfigPort,
} from "./app-initializer-config-port.js";
import {
  createAppInitializerDesktopPort,
} from "./app-initializer-desktop-port.js";

export function createAppInitializerRuntimePort(overrides = {}) {
  const configPort = createAppInitializerConfigPort(overrides.configPort);
  const desktopPort = createAppInitializerDesktopPort(overrides.desktopPort);

  return Object.freeze({
    ...configPort,
    ...desktopPort,
    configPort,
    desktopPort,
    ...overrides,
  });
}
