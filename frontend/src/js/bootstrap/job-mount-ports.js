import {
  createJobDataMountPort,
} from "./job-data-mount-port.js";
import {
  createJobFeatureControllersPort,
} from "./job-feature-controllers-port.js";
import {
  createJobLegacyStateMountPort,
} from "./job-legacy-state-mount-port.js";
import {
  createJobRuntimeMountPort,
} from "./job-runtime-mount-port.js";
import {
  createJobRuntimeJobPresentationPort,
} from "./job-runtime-job-presentation-port.js";
import {
  createJobRuntimeResetStateAdapterPort,
} from "./job-runtime-reset-state-port.js";
import {
  createJobTranslationDebugMountPort,
} from "./job-translation-debug-mount-port.js";
import {
  createJobUiMountPort,
} from "./job-ui-mount-port.js";

export function createJobMountPorts(overrides = {}) {
  const featureControllersPort = createJobFeatureControllersPort(overrides.featureControllersPort);
  const legacyStatePort = createJobLegacyStateMountPort(overrides.legacyStatePort);
  const runtimePort = createJobRuntimeMountPort(overrides.runtimePort);
  const jobPresentationPort = createJobRuntimeJobPresentationPort(
    overrides.jobPresentationPort,
  );
  const dataPort = createJobDataMountPort(overrides.dataPort);
  const translationDebugPort = createJobTranslationDebugMountPort(overrides.translationDebugPort);
  const uiPort = createJobUiMountPort(overrides.uiPort);
  const resetStateAdapterPort = createJobRuntimeResetStateAdapterPort({
    state: legacyStatePort.state,
  });

  return Object.freeze({
    ...featureControllersPort,
    ...legacyStatePort,
    ...runtimePort,
    ...jobPresentationPort,
    ...dataPort,
    ...translationDebugPort,
    ...uiPort,
    ...resetStateAdapterPort,
    dataPort,
    featureControllersPort,
    legacyStatePort,
    resetStateAdapterPort,
    jobPresentationPort,
    runtimePort,
    translationDebugPort,
    uiPort,
    ...overrides,
  });
}

export const defaultJobMountPorts = createJobMountPorts();
