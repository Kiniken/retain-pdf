import {
  defaultConfigBootstrapPorts,
} from "./config-bootstrap-ports.js";
import {
  buildHiddenCredentialPayload,
} from "./config-bootstrap-payloads.js";

export function applyPersistedConfig(state, persistedConfig, ports = defaultConfigBootstrapPorts) {
  const browserStored = persistedConfig.browserConfig || {};
  ports.setDeveloperConfig(state, persistedConfig.developerConfig || {});
  ports.applyHiddenCredentialInputs(
    buildHiddenCredentialPayload({ browserStored, ports }),
  );
}
