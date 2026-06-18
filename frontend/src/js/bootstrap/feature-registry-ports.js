import { bindFeatureEvents } from "./bind-feature-events.js";
import { createFeatureRegistryLibraryEventPort } from "./feature-registry-library-event-port.js";
import { mountCredentialAndActionFeatures } from "./mount-credential-action-features.js";
import { mountGlossaryFeature } from "./mount-glossary-feature.js";
import { mountCoreFeatures } from "./mount-core-features.js";
import { mountJobFeatures } from "./mount-job-features.js";
import { mountUploadWorkflowFeatures } from "./mount-upload-workflow-features.js";

export function createFeatureRegistryPorts(overrides = {}) {
  const libraryEventPort = createFeatureRegistryLibraryEventPort(overrides.libraryEventPort);
  return Object.freeze({
    ...libraryEventPort,
    bindFeatureEvents,
    libraryEventPort,
    mountCoreFeatures,
    mountCredentialAndActionFeatures,
    mountGlossaryFeature,
    mountJobFeatures,
    mountUploadWorkflowFeatures,
    ...overrides,
  });
}

export const defaultFeatureRegistryPorts = createFeatureRegistryPorts();
