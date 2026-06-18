import {
  createConfigBootstrapCredentialsPort,
} from "./config-bootstrap-credentials-port.js";
import {
  createConfigBootstrapDefaultsPort,
} from "./config-bootstrap-defaults-port.js";
import {
  createConfigBootstrapDeveloperStatePort,
} from "./config-bootstrap-developer-state-port.js";

export function createConfigBootstrapPorts(overrides = {}) {
  const credentialsPort = createConfigBootstrapCredentialsPort(overrides.credentialsPort);
  const defaultsPort = createConfigBootstrapDefaultsPort(overrides.defaultsPort);
  const developerStatePort = createConfigBootstrapDeveloperStatePort(overrides.developerStatePort);

  return Object.freeze({
    ...defaultsPort,
    ...credentialsPort,
    ...developerStatePort,
    credentialsPort,
    defaultsPort,
    developerStatePort,
    ...overrides,
  });
}

export const defaultConfigBootstrapPorts = createConfigBootstrapPorts();
