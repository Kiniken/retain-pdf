import {
  createWorkflowConfigDeveloperStatePort,
} from "./workflow-config-developer-state-port.js";
import {
  createWorkflowConfigPersistencePort,
} from "./workflow-config-persistence-port.js";

export function createWorkflowConfigStatePort(overrides = {}) {
  const developerStatePort = createWorkflowConfigDeveloperStatePort(overrides.developerStatePort);
  const persistencePort = createWorkflowConfigPersistencePort(overrides.persistencePort);

  return Object.freeze({
    ...developerStatePort,
    ...persistencePort,
    developerStatePort,
    persistencePort,
    ...overrides,
  });
}
