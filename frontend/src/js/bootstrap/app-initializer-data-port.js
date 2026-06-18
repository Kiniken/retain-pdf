import {
  createAppInitializerDataHttpPort,
} from "./app-initializer-data-http-port.js";
import {
  createAppInitializerDataJobsPort,
} from "./app-initializer-data-jobs-port.js";

export function createAppInitializerDataPort(overrides = {}) {
  const httpPort = createAppInitializerDataHttpPort(overrides.httpPort);
  const jobsPort = createAppInitializerDataJobsPort(overrides.jobsPort);

  return Object.freeze({
    ...httpPort,
    ...jobsPort,
    httpPort,
    jobsPort,
    ...overrides,
  });
}
