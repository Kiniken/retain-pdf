import {
  createUploadWorkflowFeatureControllersPort,
} from "./upload-workflow-feature-controllers-port.js";
import { createUploadRuntimeMountPort } from "./upload-runtime-mount-port.js";
import {
  createUploadWorkflowCredentialsStatePort,
} from "./upload-workflow-credentials-state-port.js";
import { createWorkflowConfigMountPort } from "./workflow-config-mount-port.js";
import { createWorkflowGlossaryMountPort } from "./workflow-glossary-mount-port.js";
import { createWorkflowSubmitValuesPort } from "./workflow-submit-values-port.js";
import { createWorkflowViewMountPort } from "./workflow-view-mount-port.js";

export function createUploadWorkflowMountPorts(overrides = {}) {
  const {
    workflowViewMountPort: workflowViewMountPortOverride,
    workflowViewPort: workflowViewPortOverride,
    ...passthroughOverrides
  } = overrides;
  const featureControllersPort = createUploadWorkflowFeatureControllersPort(
    overrides.featureControllersPort,
  );
  const credentialsStateMountPort = createUploadWorkflowCredentialsStatePort(
    overrides.credentialsStateMountPort,
  );
  const uploadRuntimePort = createUploadRuntimeMountPort(overrides.uploadRuntimePort);
  const workflowConfigRuntimePort = createWorkflowConfigMountPort(overrides.workflowConfigRuntimePort);
  const workflowGlossaryPort = createWorkflowGlossaryMountPort(overrides.workflowGlossaryPort);
  const workflowSubmitValuesPort = createWorkflowSubmitValuesPort(overrides.workflowSubmitValuesPort);
  const workflowViewMountPort = workflowViewMountPortOverride
    || createWorkflowViewMountPort(workflowViewPortOverride);
  return Object.freeze({
    ...featureControllersPort,
    ...credentialsStateMountPort,
    ...uploadRuntimePort,
    ...workflowConfigRuntimePort,
    ...workflowGlossaryPort,
    ...workflowSubmitValuesPort,
    ...workflowViewMountPort,
    credentialsStateMountPort,
    featureControllersPort,
    uploadRuntimePort,
    workflowConfigRuntimePort,
    workflowGlossaryPort,
    workflowSubmitValuesPort,
    workflowViewMountPort,
    ...passthroughOverrides,
  });
}

export const defaultUploadWorkflowMountPorts = createUploadWorkflowMountPorts();
