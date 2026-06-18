import {
  createCredentialRuntimeModelDefaultsPort,
} from "./credential-runtime-model-defaults-port.js";
import {
  createCredentialRuntimeOcrDefaultsPort,
} from "./credential-runtime-ocr-defaults-port.js";
import {
  createCredentialRuntimePersistencePort,
} from "./credential-runtime-persistence-port.js";

export function createCredentialRuntimeDefaultsPort(overrides = {}) {
  const modelDefaultsPort = createCredentialRuntimeModelDefaultsPort(overrides.modelDefaultsPort);
  const ocrDefaultsPort = createCredentialRuntimeOcrDefaultsPort(overrides.ocrDefaultsPort);
  const persistencePort = createCredentialRuntimePersistencePort(overrides.persistencePort);

  return Object.freeze({
    ...ocrDefaultsPort,
    ...modelDefaultsPort,
    ...persistencePort,
    modelDefaultsPort,
    ocrDefaultsPort,
    persistencePort,
    ...overrides,
  });
}
