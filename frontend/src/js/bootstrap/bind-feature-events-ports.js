import {
  createBindFeatureEventsDataPort,
} from "./bind-feature-events-data-port.js";
import {
  createBindFeatureEventsLegacyStatePort,
} from "./bind-feature-events-legacy-state-port.js";
import {
  createBindFeatureEventsMainEventPort,
} from "./bind-feature-events-main-event-port.js";
import {
  createBindFeatureEventsUiPort,
} from "./bind-feature-events-ui-port.js";

export function createBindFeatureEventsPorts(overrides = {}) {
  const dataPort = createBindFeatureEventsDataPort(overrides.dataPort);
  const legacyStatePort = createBindFeatureEventsLegacyStatePort(overrides.legacyStatePort);
  const mainEventPort = createBindFeatureEventsMainEventPort(overrides.mainEventPort);
  const uiPort = createBindFeatureEventsUiPort(overrides.uiPort);

  return Object.freeze({
    ...legacyStatePort,
    ...dataPort,
    ...mainEventPort,
    ...uiPort,
    dataPort,
    legacyStatePort,
    mainEventPort,
    uiPort,
    ...overrides,
  });
}

export const defaultBindFeatureEventsPorts = createBindFeatureEventsPorts();
