import {
  createCoreAppShellUiMountPort,
} from "./core-app-shell-ui-mount-port.js";
import {
  createCoreAppUpdateRuntimePort,
} from "./core-app-update-runtime-port.js";
import {
  createCoreFeatureControllersPort,
} from "./core-feature-controllers-port.js";
import {
  createCoreHomeMountPort,
} from "./core-home-mount-port.js";
import {
  createCorePresentationMountPort,
} from "./core-presentation-mount-port.js";
import {
  createCoreTranslationWorkflowStatusAreaPort,
} from "./core-translation-workflow-status-area-port.js";

export function createCoreFeatureMountPorts(overrides = {}) {
  const controllersPort = createCoreFeatureControllersPort(overrides.controllersPort);
  const appUpdateRuntimePort = createCoreAppUpdateRuntimePort(overrides.appUpdateRuntimePort);
  const homePort = createCoreHomeMountPort(overrides.homePort);
  const appShellUiPort = createCoreAppShellUiMountPort(overrides.appShellUiPort);
  const presentationPort = createCorePresentationMountPort(overrides.presentationPort);
  const translationWorkflowStatusAreaPort = createCoreTranslationWorkflowStatusAreaPort(
    overrides.translationWorkflowStatusAreaPort,
  );

  return Object.freeze({
    ...controllersPort,
    ...appUpdateRuntimePort,
    ...homePort,
    ...appShellUiPort,
    ...presentationPort,
    translationWorkflowStatusAreaPort,
    appShellUiPort,
    appUpdateRuntimePort,
    controllersPort,
    homePort,
    presentationPort,
    ...overrides,
  });
}

export const defaultCoreFeatureMountPorts = createCoreFeatureMountPorts();
