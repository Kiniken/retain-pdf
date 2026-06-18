import {
  createUploadDeveloperFeatureControllerPort,
} from "./upload-developer-feature-controller-port.js";
import {
  createUploadFeatureControllerPort,
} from "./upload-feature-controller-port.js";
import {
  createUploadFormDataPort,
} from "./upload-form-data-port.js";
import {
  createWorkflowFeatureControllerPort,
} from "./workflow-feature-controller-port.js";

export function createUploadWorkflowFeatureControllersPort(overrides = {}) {
  const developerControllerPort = createUploadDeveloperFeatureControllerPort(
    overrides.developerControllerPort,
  );
  const uploadControllerPort = createUploadFeatureControllerPort(
    overrides.uploadControllerPort,
  );
  const uploadFormDataPort = createUploadFormDataPort(
    overrides.uploadFormDataPort,
  );
  const workflowControllerPort = createWorkflowFeatureControllerPort(
    overrides.workflowControllerPort,
  );

  return Object.freeze({
    ...developerControllerPort,
    ...uploadControllerPort,
    ...uploadFormDataPort,
    ...workflowControllerPort,
    developerControllerPort,
    uploadControllerPort,
    uploadFormDataPort,
    workflowControllerPort,
    ...overrides,
  });
}
