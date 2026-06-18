import {
  createCredentialRuntimeApiConfigPort,
} from "./credential-runtime-api-config-port.js";
import {
  createCredentialRuntimeAppActionsConfigPort,
} from "./credential-runtime-app-actions-config-port.js";

export function createCredentialRuntimeConfigPort(overrides = {}) {
  const {
    appActionsConfigPort: appActionsConfigPortOverride,
    appActionsConfigPortPort,
    ...flatOverrides
  } = overrides;
  const apiConfigPort = createCredentialRuntimeApiConfigPort(overrides.apiConfigPort);
  const appActionsConfigOverride = appActionsConfigPortOverride
    ? { appActionsConfigPort: appActionsConfigPortOverride }
    : appActionsConfigPortPort;
  const appActionsConfigPortPortValue = createCredentialRuntimeAppActionsConfigPort(
    appActionsConfigOverride,
  );

  return Object.freeze({
    ...apiConfigPort,
    ...appActionsConfigPortPortValue,
    apiConfigPort,
    appActionsConfigPort: appActionsConfigPortPortValue.appActionsConfigPort,
    appActionsConfigPortPort: appActionsConfigPortPortValue,
    ...flatOverrides,
  });
}
