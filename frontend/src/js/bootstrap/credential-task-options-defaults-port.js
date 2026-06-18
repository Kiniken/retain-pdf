import {
  createCredentialTaskOptionsDeveloperStatePort,
} from "./credential-task-options-developer-state-port.js";
import {
  createCredentialTaskOptionsLegacyStatePort,
} from "./credential-task-options-legacy-state-port.js";
import {
  createCredentialTaskOptionsPersistencePort,
} from "./credential-task-options-persistence-port.js";

export function createCredentialTaskOptionsDefaultsPort(overrides = {}) {
  const developerStatePort = createCredentialTaskOptionsDeveloperStatePort(overrides.developerStatePort);
  const legacyStatePort = createCredentialTaskOptionsLegacyStatePort(overrides.legacyStatePort);
  const persistencePort = createCredentialTaskOptionsPersistencePort(overrides.persistencePort);

  return Object.freeze({
    ...developerStatePort,
    ...legacyStatePort,
    ...persistencePort,
    developerStatePort,
    legacyStatePort,
    persistencePort,
    ...overrides,
  });
}
