import {
  defaultMainEventPort,
} from "./main-event-port.js";

export function createBindFeatureEventsMainEventPort(overrides = {}) {
  return Object.freeze({
    eventPort: defaultMainEventPort,
    ...overrides,
  });
}
