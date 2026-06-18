import {
  createWorkflowConfigConstantRuntimePort,
} from "./workflow-config-constant-runtime-port.js";
import {
  createWorkflowConfigDesktopRuntimePort,
} from "./workflow-config-desktop-runtime-port.js";
import {
  createWorkflowConfigFeatureRuntimePort,
} from "./workflow-config-feature-runtime-port.js";
import {
  createWorkflowConfigNormalizerRuntimePort,
} from "./workflow-config-normalizer-runtime-port.js";

export function createWorkflowConfigRuntimePort(overrides = {}) {
  const constantRuntimePort = createWorkflowConfigConstantRuntimePort(overrides.constantRuntimePort);
  const desktopRuntimePort = createWorkflowConfigDesktopRuntimePort(overrides.desktopRuntimePort);
  const featureRuntimePort = createWorkflowConfigFeatureRuntimePort(overrides.featureRuntimePort);
  const normalizerRuntimePort = createWorkflowConfigNormalizerRuntimePort(overrides.normalizerRuntimePort);

  return Object.freeze({
    ...constantRuntimePort,
    ...desktopRuntimePort,
    ...featureRuntimePort,
    ...normalizerRuntimePort,
    constantRuntimePort,
    desktopRuntimePort,
    featureRuntimePort,
    normalizerRuntimePort,
    ...overrides,
  });
}
