import {
  createCredentialRuntimeEndpointPort,
} from "./credential-runtime-endpoint-port.js";
import {
  createCredentialRuntimeProtectedFetchPort,
} from "./credential-runtime-protected-fetch-port.js";

export function createCredentialRuntimeHttpPort(overrides = {}) {
  const endpointPort = createCredentialRuntimeEndpointPort(overrides.endpointPort);
  const protectedFetchPort = createCredentialRuntimeProtectedFetchPort(overrides.protectedFetchPort);

  return Object.freeze({
    ...endpointPort,
    ...protectedFetchPort,
    endpointPort,
    protectedFetchPort,
    ...overrides,
  });
}
