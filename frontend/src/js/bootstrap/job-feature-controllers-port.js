import {
  createJobRuntimeFeatureControllerPort,
} from "./job-runtime-feature-controller-port.js";
import {
  createStatusDetailFeatureControllerPort,
} from "./status-detail-feature-controller-port.js";

export function createJobFeatureControllersPort(overrides = {}) {
  const jobRuntimeControllerPort = createJobRuntimeFeatureControllerPort(
    overrides.jobRuntimeControllerPort,
  );
  const statusDetailControllerPort = createStatusDetailFeatureControllerPort(
    overrides.statusDetailControllerPort,
  );

  return Object.freeze({
    ...jobRuntimeControllerPort,
    ...statusDetailControllerPort,
    jobRuntimeControllerPort,
    statusDetailControllerPort,
    ...overrides,
  });
}
