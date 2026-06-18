import {
  createCredentialAppActionsFeatureControllerPort,
} from "./credential-app-actions-feature-controller-port.js";
import {
  createCredentialArtifactDownloadsFeatureControllerPort,
} from "./credential-artifact-downloads-feature-controller-port.js";
import {
  createCredentialBrowserFeatureControllerPort,
} from "./credential-browser-feature-controller-port.js";

export function createCredentialActionFeatureControllersPort(overrides = {}) {
  const appActionsControllerPort = createCredentialAppActionsFeatureControllerPort(
    overrides.appActionsControllerPort,
  );
  const artifactDownloadsControllerPort = createCredentialArtifactDownloadsFeatureControllerPort(
    overrides.artifactDownloadsControllerPort,
  );
  const browserCredentialsControllerPort = createCredentialBrowserFeatureControllerPort(
    overrides.browserCredentialsControllerPort,
  );

  return Object.freeze({
    ...appActionsControllerPort,
    ...artifactDownloadsControllerPort,
    ...browserCredentialsControllerPort,
    appActionsControllerPort,
    artifactDownloadsControllerPort,
    browserCredentialsControllerPort,
    ...overrides,
  });
}
