import {
  createJobDataHttpPort,
} from "./job-data-http-port.js";
import {
  createJobDataJobsPort,
} from "./job-data-jobs-port.js";

export function createJobDataMountPort(overrides = {}) {
  const httpPort = createJobDataHttpPort(overrides.httpPort);
  const jobsPort = createJobDataJobsPort(overrides.jobsPort);

  return Object.freeze({
    ...httpPort,
    ...jobsPort,
    httpPort,
    jobsPort,
    ...overrides,
  });
}
