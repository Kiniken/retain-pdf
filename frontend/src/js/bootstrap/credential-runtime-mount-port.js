import {
  createCredentialRuntimeConfigPort,
} from "./credential-runtime-config-port.js";
import {
  createCredentialRuntimeDataPort,
} from "./credential-runtime-data-port.js";
import {
  createCredentialRuntimeDefaultsPort,
} from "./credential-runtime-defaults-port.js";

export function createCredentialRuntimeMountPort(overrides = {}) {
  const configPort = createCredentialRuntimeConfigPort(overrides.configPort);
  const dataPort = createCredentialRuntimeDataPort(overrides.dataPort);
  const defaultsPort = createCredentialRuntimeDefaultsPort(overrides.defaultsPort);

  return Object.freeze({
    ...configPort,
    ...dataPort,
    ...defaultsPort,
    configPort,
    dataPort,
    defaultsPort,
    ...overrides,
  });
}
