import {
  createJobTranslationDebugDataPort,
} from "./job-translation-debug-data-port.js";

export function createJobTranslationDebugMountPort(overrides = {}) {
  const dataPort = createJobTranslationDebugDataPort(overrides.dataPort);

  return Object.freeze({
    ...dataPort,
    dataPort,
    ...overrides,
  });
}
