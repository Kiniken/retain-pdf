import {
  createJobDataControlPort,
} from "./job-data-control-port.js";
import {
  createJobDataReadPort,
} from "./job-data-read-port.js";
import {
  createJobDataStatusPort,
} from "./job-data-status-port.js";

export function createJobDataJobsPort(overrides = {}) {
  const controlPort = createJobDataControlPort(overrides.controlPort);
  const readPort = createJobDataReadPort(overrides.readPort);
  const statusPort = createJobDataStatusPort(overrides.statusPort);

  return Object.freeze({
    ...readPort,
    ...statusPort,
    ...controlPort,
    controlPort,
    readPort,
    statusPort,
    ...overrides,
  });
}
