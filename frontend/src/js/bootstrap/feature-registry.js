import { checkApiConnectivity } from "./api-connectivity.js";
import { createFeatureSlots } from "./feature-slots.js";
import {
  defaultFeatureRegistryPorts,
} from "./feature-registry-ports.js";

export function mountApplicationFeatures({
  ports = defaultFeatureRegistryPorts,
  state,
} = {}) {
  const features = createFeatureSlots();
  features.libraryEventPort = ports.createLibraryEventPort();
  ports.mountCoreFeatures(features, { state });
  ports.mountUploadWorkflowFeatures(features);
  ports.mountGlossaryFeature(features);
  ports.mountCredentialAndActionFeatures(features);
  ports.mountJobFeatures(features);
  ports.bindFeatureEvents(features);
  return {
    ...features,
    checkApiConnectivity: () => checkApiConnectivity(features),
  };
}
