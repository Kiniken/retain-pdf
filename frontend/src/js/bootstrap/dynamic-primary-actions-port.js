import {
  createDynamicPrimaryActionsReaderPort,
} from "./dynamic-primary-actions-reader-port.js";
import {
  createDynamicPrimaryActionsTextPort,
} from "./dynamic-primary-actions-text-port.js";

export function createDynamicPrimaryActionsPort(overrides = {}) {
  const readerPort = createDynamicPrimaryActionsReaderPort(overrides.readerPort);
  const textPort = createDynamicPrimaryActionsTextPort(overrides.textPort);

  return Object.freeze({
    ...readerPort,
    ...textPort,
    readerPort,
    textPort,
    ...overrides,
  });
}

export const defaultDynamicPrimaryActionsPort = createDynamicPrimaryActionsPort();
