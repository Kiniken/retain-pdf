import {
  createStartupRouteHomeStatePort,
} from "./startup-route-home-state-port.js";
import {
  createStartupRouteRecentJobsFeaturePort,
} from "./startup-route-recent-jobs-feature-port.js";
import {
  createStartupRouteActiveJobStoragePort,
} from "./startup-route-active-job-storage-port.js";

export function createStartupRouteRecentJobsPort(overrides = {}) {
  const activeJobStoragePort = createStartupRouteActiveJobStoragePort(
    overrides.activeJobStoragePort,
  );
  const homeStatePort = createStartupRouteHomeStatePort(overrides.homeStatePort);
  const recentJobsFeaturePort = createStartupRouteRecentJobsFeaturePort(
    overrides.recentJobsFeaturePort,
  );

  return Object.freeze({
    ...activeJobStoragePort,
    ...homeStatePort,
    ...recentJobsFeaturePort,
    activeJobStoragePort,
    homeStatePort,
    recentJobsFeaturePort,
    ...overrides,
  });
}
