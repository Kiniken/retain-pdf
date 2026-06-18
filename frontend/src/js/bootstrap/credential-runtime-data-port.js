import {
  createCredentialRuntimeHttpPort,
} from "./credential-runtime-http-port.js";
import {
  createCredentialRuntimeJobsPort,
} from "./credential-runtime-jobs-port.js";

export function createCredentialRuntimeDataPort(overrides = {}) {
  const httpPort = createCredentialRuntimeHttpPort(overrides.httpPort);
  const jobsPort = createCredentialRuntimeJobsPort(overrides.jobsPort);

  return Object.freeze({
    ...httpPort,
    ...jobsPort,
    httpPort,
    jobsPort,
    ...overrides,
  });
}
