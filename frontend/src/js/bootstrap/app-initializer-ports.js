import {
  createAppInitializerDataPort,
} from "./app-initializer-data-port.js";
import {
  createAppInitializerFeaturePort,
} from "./app-initializer-feature-port.js";
import {
  createAppInitializerLegacyStatePort,
} from "./app-initializer-legacy-state-port.js";
import {
  createAppInitializerRuntimePort,
} from "./app-initializer-runtime-port.js";
import {
  createAppInitializerUiPort,
} from "./app-initializer-ui-port.js";
import {
  createStartupRoutePorts,
} from "./startup-route-ports.js";

export function createAppInitializerPorts(overrides = {}) {
  const legacyStatePort = createAppInitializerLegacyStatePort(overrides.legacyStatePort);
  const runtimePort = createAppInitializerRuntimePort(overrides.runtimePort);
  const dataPort = createAppInitializerDataPort(overrides.dataPort);
  const featurePort = createAppInitializerFeaturePort(overrides.featurePort);
  const uiPort = createAppInitializerUiPort(overrides.uiPort);
  const startupRoutePort = createStartupRoutePorts(overrides.startupRoutePort);

  return Object.freeze({
    ...legacyStatePort,
    ...runtimePort,
    ...dataPort,
    ...featurePort,
    ...startupRoutePort,
    ...uiPort,
    dataPort,
    featurePort,
    legacyStatePort,
    runtimePort,
    startupRoutePort,
    uiPort,
    ...overrides,
  });
}

export const defaultAppInitializerPorts = createAppInitializerPorts();
