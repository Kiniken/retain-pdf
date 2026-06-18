import {
  createAppInitializerEnvironmentPort,
} from "./app-initializer-environment-port.js";
import {
  createAppInitializerPersistedConfigPort,
} from "./app-initializer-persisted-config-port.js";
import {
  createConfigBootstrapPorts,
} from "./config-bootstrap-ports.js";

export function createAppInitializerConfigPort(overrides = {}) {
  const environmentPort = createAppInitializerEnvironmentPort(overrides.environmentPort);
  const persistedConfigPort = createAppInitializerPersistedConfigPort(overrides.persistedConfigPort);
  const configBootstrapPort = createConfigBootstrapPorts(overrides.configBootstrapPort);

  return Object.freeze({
    ...environmentPort,
    ...persistedConfigPort,
    ...configBootstrapPort,
    configBootstrapPort,
    environmentPort,
    persistedConfigPort,
    ...overrides,
  });
}
