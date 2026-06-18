import { createCredentialsPorts } from "./feature-credentials-ports.js";
import { createUploadPorts } from "./feature-upload-ports.js";
import { createWorkflowPorts } from "./feature-workflow-ports.js";
import {
  buildDeveloperFeatureMountPayload,
  buildUploadFeatureMountPayload,
  buildWorkflowFeatureMountPayload,
} from "./upload-workflow-feature-mount-payloads.js";
import {
  defaultUploadWorkflowMountPorts,
} from "./upload-workflow-mount-ports.js";

export function mountUploadWorkflowFeatures(
  features,
  {
    ports = defaultUploadWorkflowMountPorts,
  } = {},
) {
  const uploadPorts = createUploadPorts(features);
  const uploadStatePort = features.uploadStatePort || ports.createUploadStatePort(ports.state);
  features.uploadStatePort = uploadStatePort;
  const credentialsStatePort = features.credentialsStatePort || ports.credentialsStatePort;
  features.credentialsStatePort = credentialsStatePort;
  const workflowPorts = createWorkflowPorts(features);
  const credentialsPorts = createCredentialsPorts(features);
  features.workflowFeature = ports.mountWorkflowFeature(
    buildWorkflowFeatureMountPayload({
      credentialsPorts,
      credentialsStatePort,
      ports,
      uploadPorts,
      uploadStatePort,
    }),
  );
  features.developerFeature = ports.mountDeveloperFeature(
    buildDeveloperFeatureMountPayload({ workflowPorts }),
  );
  features.uploadFeature = ports.mountUploadFeature(
    buildUploadFeatureMountPayload({
      credentialsPorts,
      ports,
      uploadStatePort,
      workflowPorts,
    }),
  );
}
