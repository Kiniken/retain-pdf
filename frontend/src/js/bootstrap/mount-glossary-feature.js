import {
  defaultGlossaryMountPorts,
} from "./glossary-mount-ports.js";
import { createWorkflowPorts } from "./feature-workflow-ports.js";
import {
  buildGlossaryFeatureMountPayload,
} from "./glossary-feature-mount-payloads.js";

export function mountGlossaryFeature(features, ports = defaultGlossaryMountPorts) {
  const workflowPorts = createWorkflowPorts(features);
  features.glossariesFeature = ports.mountGlossariesFeature(
    buildGlossaryFeatureMountPayload({ ports, workflowPorts }),
  );
}
