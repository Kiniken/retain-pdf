import {
  createCredentialProviderDataPort,
} from "./credential-provider-data-port.js";
import {
  createCredentialProviderDefaultsPort,
} from "./credential-provider-defaults-port.js";

export function createCredentialProviderValidationDepsPort(overrides = {}) {
  const dataPort = createCredentialProviderDataPort({
    ...(overrides.dataPort || {}),
    ...(overrides.validatePaddle ? { validatePaddleToken: overrides.validatePaddle } : {}),
    ...(overrides.validateMineru ? { validateMineruToken: overrides.validateMineru } : {}),
  });
  const defaultsPort = createCredentialProviderDefaultsPort({
    ...(overrides.defaultsPort || {}),
    ...(overrides.defaultModelVersion ? { defaultModelVersion: overrides.defaultModelVersion } : {}),
  });

  return Object.freeze({
    defaultModelVersion: defaultsPort.defaultModelVersion,
    validateMineru: dataPort.validateMineruToken,
    validatePaddle: dataPort.validatePaddleToken,
    dataPort,
    defaultsPort,
  });
}
