import {
  createMainEventBrowserConfigPersistencePort,
} from "./main-event-browser-config-persistence-port.js";
import {
  createMainEventHiddenCredentialPort,
} from "./main-event-hidden-credential-port.js";
import {
  createMainEventHiddenCredentialBindingPort,
} from "./main-event-hidden-credential-binding-port.js";

export function createMainEventCredentialPersistencePort(overrides = {}) {
  const browserConfigPersistencePort = createMainEventBrowserConfigPersistencePort(
    overrides.browserConfigPersistencePort ?? (
      overrides.saveBrowserConfig ? { saveBrowserConfig: overrides.saveBrowserConfig } : {}
    ),
  );
  const hiddenCredentialPort = createMainEventHiddenCredentialPort(
    overrides.hiddenCredentialPort ?? (
      overrides.bindCredentialPersistence
        ? { bindCredentialPersistence: overrides.bindCredentialPersistence }
        : {}
    ),
  );
  const hiddenCredentialBindingPort = createMainEventHiddenCredentialBindingPort(
    overrides.hiddenCredentialBindingPort,
  );

  return Object.freeze({
    ...browserConfigPersistencePort,
    ...hiddenCredentialPort,
    bindHiddenCredentialPersistence: () => (
      hiddenCredentialBindingPort.bindHiddenCredentialPersistence({
        browserConfigPersistencePort,
        hiddenCredentialPort,
      })
    ),
    browserConfigPersistencePort,
    hiddenCredentialPort,
    hiddenCredentialBindingPort,
    ...overrides,
  });
}
