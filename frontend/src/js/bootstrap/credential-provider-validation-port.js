import {
  validateOcrTokenForProvider as validateOcrTokenForProviderWithDeps,
} from "./credential-provider-actions.js";
import {
  createCredentialProviderValidationDepsPort,
} from "./credential-provider-validation-deps-port.js";

export function validateOcrTokenForProvider(
  apiPrefix,
  providerId,
  token,
  {
    defaultModelVersion,
    validatePaddle,
    validateMineru,
    dataPort,
    defaultsPort,
  } = {},
) {
  const deps = createCredentialProviderValidationDepsPort({
    dataPort,
    defaultModelVersion,
    defaultsPort,
    validateMineru,
    validatePaddle,
  });

  return validateOcrTokenForProviderWithDeps(apiPrefix, providerId, token, {
    defaultModelVersion: deps.defaultModelVersion,
    validatePaddle: deps.validatePaddle,
    validateMineru: deps.validateMineru,
  });
}

export function createCredentialProviderValidationPort(overrides = {}) {
  return Object.freeze({
    validateOcrToken: (apiPrefix, providerId, token, options) => validateOcrTokenForProvider(
      apiPrefix,
      providerId,
      token,
      options,
    ),
    ...overrides,
  });
}
