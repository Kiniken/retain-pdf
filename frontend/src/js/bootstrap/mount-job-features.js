import {
  defaultJobMountPorts,
} from "./job-mount-ports.js";
import {
  buildJobRuntimeMountPayload,
  buildStatusDetailMountPayload,
} from "./job-feature-mount-payloads.js";

export function mountJobFeatures(
  features,
  {
    ports = defaultJobMountPorts,
  } = {},
) {
  features.statusDetailFeature = ports.mountStatusDetailFeature(
    buildStatusDetailMountPayload({ features, ports }),
  );
  features.jobRuntimeFeature = ports.mountJobRuntimeFeature(
    buildJobRuntimeMountPayload({ features, ports }),
  );
}
