import {
  createStartupRouteReaderPort,
} from "./startup-route-reader-port.js";
import {
  createStartupRouteCurrentJobPort,
} from "./startup-route-current-job-port.js";
import {
  createStartupRouteRecentJobsPort,
} from "./startup-route-recent-jobs-port.js";
import {
  createStartupRouteRuntimePort,
} from "./startup-route-runtime-port.js";
import {
  createStartupRouteUiPort,
} from "./startup-route-ui-port.js";

export function createStartupRoutePorts(overrides = {}) {
  const readerPort = createStartupRouteReaderPort(overrides.readerPort);
  const recentJobsPort = createStartupRouteRecentJobsPort(overrides.recentJobsPort);
  const runtimePort = createStartupRouteRuntimePort(overrides.runtimePort);
  const uiPort = createStartupRouteUiPort(overrides.uiPort);

  return Object.freeze({
    ...runtimePort,
    ...recentJobsPort,
    ...readerPort,
    ...uiPort,
    createStartupRouteCurrentJobPort,
    readerPort,
    recentJobsPort,
    runtimePort,
    uiPort,
    ...overrides,
  });
}

export const defaultStartupRoutePorts = createStartupRoutePorts();
