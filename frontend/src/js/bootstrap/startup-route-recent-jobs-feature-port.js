import {
  createStartupRouteRecentJobsControllerPort,
} from "./startup-route-recent-jobs-controller-port.js";
import {
  createStartupRouteRecentJobsReaderPort,
} from "./startup-route-recent-jobs-reader-port.js";
import {
  createStartupRouteRecentJobsRuntimePort,
} from "./startup-route-recent-jobs-runtime-port.js";
import {
  createStartupRouteRecentJobsStatePort,
} from "./startup-route-recent-jobs-state-port.js";
import {
  createStartupRouteRecentJobsStageAdapterPort,
} from "./startup-route-recent-jobs-stage-adapter-port.js";

export function createStartupRouteRecentJobsFeaturePort(overrides = {}) {
  const controllerPort = createStartupRouteRecentJobsControllerPort(overrides.controllerPort);
  const readerPort = createStartupRouteRecentJobsReaderPort(overrides.readerPort);
  const runtimePort = createStartupRouteRecentJobsRuntimePort(overrides.runtimePort);
  const statePort = createStartupRouteRecentJobsStatePort(overrides.statePort);
  const stageAdapterPort = createStartupRouteRecentJobsStageAdapterPort(
    overrides.stageAdapterPort,
  );

  return Object.freeze({
    ...controllerPort,
    ...readerPort,
    ...runtimePort,
    ...statePort,
    ...stageAdapterPort,
    controllerPort,
    readerPort,
    runtimePort,
    statePort,
    stageAdapterPort,
    ...overrides,
  });
}
