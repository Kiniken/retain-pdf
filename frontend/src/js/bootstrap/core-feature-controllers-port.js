import {
  createCoreAppShellFeatureControllerPort,
} from "./core-app-shell-feature-controller-port.js";
import {
  createCoreAppUpdateFeatureControllerPort,
} from "./core-app-update-feature-controller-port.js";
import {
  createCoreHomeFeatureControllerPort,
} from "./core-home-feature-controller-port.js";
import {
  createCoreTranslationWorkflowFeatureControllerPort,
} from "./core-translation-workflow-feature-controller-port.js";

export function createCoreFeatureControllersPort(overrides = {}) {
  const appShellControllerPort = createCoreAppShellFeatureControllerPort(
    overrides.appShellControllerPort,
  );
  const appUpdateControllerPort = createCoreAppUpdateFeatureControllerPort(
    overrides.appUpdateControllerPort,
  );
  const homeControllerPort = createCoreHomeFeatureControllerPort(
    overrides.homeControllerPort,
  );
  const translationWorkflowControllerPort = createCoreTranslationWorkflowFeatureControllerPort(
    overrides.translationWorkflowControllerPort,
  );

  return Object.freeze({
    ...appShellControllerPort,
    ...appUpdateControllerPort,
    ...homeControllerPort,
    ...translationWorkflowControllerPort,
    appShellControllerPort,
    appUpdateControllerPort,
    homeControllerPort,
    translationWorkflowControllerPort,
    ...overrides,
  });
}
