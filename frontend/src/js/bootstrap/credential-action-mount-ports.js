import {
  createCredentialActionFeatureControllersPort,
} from "./credential-action-feature-controllers-port.js";
import {
  createCredentialProviderMountPort,
} from "./credential-provider-mount-port.js";
import {
  createCredentialDesktopMountPort,
} from "./credential-desktop-mount-port.js";
import {
  createCredentialTaskOptionsMountPort,
} from "./credential-task-options-mount-port.js";
import {
  createCredentialRuntimeMountPort,
} from "./credential-runtime-mount-port.js";
import {
  createCredentialUiMountPort,
} from "./credential-ui-mount-port.js";
import {
  createCredentialLegacyStateMountPort,
} from "./credential-legacy-state-mount-port.js";
import {
  createCredentialActionStateAdapterPort,
} from "./credential-action-state-adapter-port.js";
import {
  createCredentialBrowserViewPort,
} from "./credential-browser-view-port.js";

export function createCredentialActionMountPorts(overrides = {}) {
  const featureControllersPort = createCredentialActionFeatureControllersPort(
    overrides.featureControllersPort,
  );
  const legacyStatePort = createCredentialLegacyStateMountPort(overrides.legacyStatePort);
  const runtimePort = createCredentialRuntimeMountPort(overrides.runtimePort);
  const providerPort = createCredentialProviderMountPort(overrides.providerPort);
  const desktopPort = createCredentialDesktopMountPort(overrides.desktopPort);
  const taskOptionsPort = createCredentialTaskOptionsMountPort(overrides.taskOptionsPort);
  const uiPort = createCredentialUiMountPort(overrides.uiPort);
  const browserCredentialViewPort = overrides.browserCredentialViewPort
    || createCredentialBrowserViewPort(overrides.browserCredentialViewPortOptions);
  const stateAdapterPort = createCredentialActionStateAdapterPort({
    credentialsStatePort: overrides.credentialsStatePort,
    state: legacyStatePort.state,
    uploadStatePort: overrides.uploadStatePort,
  });
  return Object.freeze({
    ...featureControllersPort,
    ...legacyStatePort,
    ...runtimePort,
    ...providerPort,
    ...desktopPort,
    ...taskOptionsPort,
    ...uiPort,
    ...stateAdapterPort,
    browserCredentialViewPort,
    desktopPort,
    featureControllersPort,
    legacyStatePort,
    providerPort,
    runtimePort,
    stateAdapterPort,
    taskOptionsPort,
    uiPort,
    ...overrides,
  });
}

export const defaultCredentialActionMountPorts = createCredentialActionMountPorts();
