import { mountStatusDetailFeature } from "../features/status-detail/controller.js";
import { createStatusDetailRuntimePort } from "./status-detail-runtime-port.js";
import {
  defaultStatusDetailDialogViewPort,
  defaultStatusDetailTranslationViewPort,
} from "../ui/default-status-detail-adapters.js";
import {
  createStatusDetailJobActionResolverPort,
} from "./status-detail-job-action-resolver-port.js";

export function createStatusDetailFeatureControllerPort(overrides = {}) {
  const jobActionResolverPort = overrides.jobActionResolverPort
    || createStatusDetailJobActionResolverPort(overrides.jobActionResolver);
  return Object.freeze({
    jobActionResolverPort,
    mountStatusDetailFeature: (payload = {}) => mountStatusDetailFeature({
      dialogViewPort: defaultStatusDetailDialogViewPort,
      jobActionResolver: payload.jobActionResolver || jobActionResolverPort.resolveActions,
      runtimePort: payload.runtimePort || createStatusDetailRuntimePort(payload.state),
      translationViewPort: defaultStatusDetailTranslationViewPort,
      ...payload,
    }),
    ...overrides,
  });
}
