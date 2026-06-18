import {
  createGlossaryControllerMountPort,
} from "./glossary-controller-mount-port.js";
import {
  createGlossaryDataMountPort,
} from "./glossary-data-mount-port.js";
import {
  createGlossaryRuntimeMountPort,
} from "./glossary-runtime-mount-port.js";

export function createGlossaryMountPorts(overrides = {}) {
  const controllerPort = createGlossaryControllerMountPort(overrides.controllerPort);
  const runtimePort = createGlossaryRuntimeMountPort(overrides.runtimePort);
  const dataPort = createGlossaryDataMountPort(overrides.dataPort);

  return Object.freeze({
    ...controllerPort,
    ...runtimePort,
    ...dataPort,
    controllerPort,
    dataPort,
    runtimePort,
    ...overrides,
  });
}

export const defaultGlossaryMountPorts = createGlossaryMountPorts();
