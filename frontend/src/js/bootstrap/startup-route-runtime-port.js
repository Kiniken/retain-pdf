import {
  createStartupRouteConfigPort,
} from "./startup-route-config-port.js";
import {
  getRequestedJobIdFromLocation,
  getRequestedReaderJobIdFromLocation,
} from "./startup-location.js";

export function createStartupRouteRuntimePort(overrides = {}) {
  const configPort = createStartupRouteConfigPort(overrides.configPort);

  return Object.freeze({
    ...configPort,
    configPort,
    getRequestedJobIdFromLocation,
    getRequestedReaderJobIdFromLocation,
    setTimeoutFn: (handler, delay) => globalThis.setTimeout?.(handler, delay),
    ...overrides,
  });
}
