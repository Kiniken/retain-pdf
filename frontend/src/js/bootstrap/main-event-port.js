import {
  createMainEventCredentialPersistencePort,
} from "./main-event-credential-persistence-port.js";
import {
  createMainEventDocumentPort,
} from "./main-event-document-port.js";
import {
  createMainEventDomPort,
} from "./main-event-dom-port.js";
import {
  createMainEventPrimaryActionsPort,
} from "./main-event-primary-actions-port.js";
import {
  createMainEventOverridePorts,
} from "./main-event-overrides-port.js";

export function createMainEventPort(overrides = {}) {
  const overridePorts = createMainEventOverridePorts(overrides);
  const credentialPersistencePort = createMainEventCredentialPersistencePort(
    overridePorts.credentialPersistencePortOverrides,
  );
  const documentPort = createMainEventDocumentPort(
    overridePorts.documentPortOverrides,
  );
  const domPort = createMainEventDomPort(
    overridePorts.domPortOverrides,
  );
  const primaryActionsPort = createMainEventPrimaryActionsPort(
    overridePorts.primaryActionsPortOverrides,
  );

  return Object.freeze({
    ...domPort,
    ...documentPort,
    ...credentialPersistencePort,
    ...primaryActionsPort,
    credentialPersistencePort,
    documentPort,
    domPort,
    primaryActionsPort,
    ...overrides,
  });
}

export const defaultMainEventPort = createMainEventPort();
