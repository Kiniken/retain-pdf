import {
  createCredentialProviderDataPort,
} from "./credential-provider-data-port.js";
import {
  createCredentialProviderDefaultsPort,
} from "./credential-provider-defaults-port.js";
import {
  createCredentialProviderValidationPort,
  validateOcrTokenForProvider,
} from "./credential-provider-validation-port.js";

export { validateOcrTokenForProvider };

export function createCredentialProviderMountPort(overrides = {}) {
  const dataPort = createCredentialProviderDataPort(overrides.dataPort);
  const defaultsPort = createCredentialProviderDefaultsPort(overrides.defaultsPort);
  const validationPort = createCredentialProviderValidationPort({
    ...(overrides.validationPort || {}),
    validateOcrToken: overrides.validateOcrToken || (
      (apiPrefix, providerId, token) => validateOcrTokenForProvider(
        apiPrefix,
        providerId,
        token,
        {
          dataPort,
          defaultsPort,
        },
      )
    ),
  });

  return Object.freeze({
    ...dataPort,
    ...defaultsPort,
    ...validationPort,
    dataPort,
    defaultsPort,
    validationPort,
    ...overrides,
  });
}
