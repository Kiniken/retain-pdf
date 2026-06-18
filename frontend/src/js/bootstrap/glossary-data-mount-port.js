import {
  createGlossaryDataApiPort,
} from "./glossary-data-api-port.js";

export function createGlossaryDataMountPort(overrides = {}) {
  const apiPort = createGlossaryDataApiPort(overrides.apiPort);

  return Object.freeze({
    ...apiPort,
    apiPort,
    ...overrides,
  });
}
