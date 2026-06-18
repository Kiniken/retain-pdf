import {
  defaultCoreFeatureMountPorts,
} from "./core-feature-mount-ports.js";
import {
  buildAppShellFeatureMountPayload,
  buildHomeFeatureMountPayload,
  buildTranslationWorkflowDialogMountPayload,
} from "./core-feature-mount-payloads.js";

export function mountCoreFeatures(features, { state, ports = defaultCoreFeatureMountPorts } = {}) {
  const homeStatePort = ports.createHomeStatePort(state);
  features.homeFeature = ports.mountHomeFeature(
    buildHomeFeatureMountPayload({ homeStatePort }),
  );
  features.appUpdateFeature = ports.mountAppUpdateFeature({
    enabled: Boolean(ports.isAppUpdateEnabled?.()),
  });
  features.translationWorkflowDialogFeature = ports.mountTranslationWorkflowDialogFeature(
    buildTranslationWorkflowDialogMountPayload({ features, homeStatePort, ports }),
  );
  features.appShellFeature = ports.mountAppShellFeature(
    buildAppShellFeatureMountPayload({ features, ports }),
  );
}
