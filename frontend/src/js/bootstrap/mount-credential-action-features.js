import { createAppActionPorts } from "./feature-app-action-ports.js";
import { createCredentialsPorts } from "./feature-credentials-ports.js";
import { createJobRuntimePorts } from "./feature-job-runtime-ports.js";
import { createUploadPorts } from "./feature-upload-ports.js";
import { createWorkflowPorts } from "./feature-workflow-ports.js";
import {
  buildAppActionsMountPayload,
  buildArtifactDownloadsMountPayload,
  buildBrowserCredentialsMountPayload,
} from "./credential-action-feature-payloads.js";
import {
  defaultCredentialActionMountPorts,
} from "./credential-action-mount-ports.js";

export function mountCredentialAndActionFeatures(
  features,
  {
    ports = defaultCredentialActionMountPorts,
  } = {},
) {
  const appActionPorts = createAppActionPorts(features);
  const credentialsPorts = createCredentialsPorts(features);
  const jobRuntimePorts = createJobRuntimePorts(features);
  const uploadPorts = createUploadPorts(features);
  const workflowPorts = createWorkflowPorts(features);
  features.browserCredentialsFeature = ports.mountBrowserCredentialsFeature(
    buildBrowserCredentialsMountPayload({
      appActionPorts,
      credentialsStatePort: features.credentialsStatePort,
      ports,
      uploadStatePort: features.uploadStatePort,
      workflowPorts,
    }),
  );
  features.artifactDownloadsFeature = ports.mountArtifactDownloadsFeature(
    buildArtifactDownloadsMountPayload({ ports }),
  );
  features.appActionsFeature = ports.mountAppActionsFeature(
    buildAppActionsMountPayload({
      credentialsPorts,
      workflowPorts,
      uploadPorts,
      jobRuntimePorts,
      libraryEventPort: features.libraryEventPort,
      ports,
      uploadStatePort: features.uploadStatePort,
    }),
  );
}
