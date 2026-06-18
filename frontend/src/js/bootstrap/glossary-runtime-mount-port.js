import {
  createGlossaryRuntimeConfigPort,
} from "./glossary-runtime-config-port.js";

export function createGlossaryRuntimeMountPort(overrides = {}) {
  const configPort = createGlossaryRuntimeConfigPort(overrides.configPort);

  return Object.freeze({
    ...configPort,
    configPort,
    ...overrides,
  });
}
