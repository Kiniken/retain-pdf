import { createLibraryEventPort } from "../features/library/library-event-port.js";

export function createFeatureRegistryLibraryEventPort(overrides = {}) {
  return Object.freeze({
    createLibraryEventPort,
    ...overrides,
  });
}

export const defaultFeatureRegistryLibraryEventPort = createFeatureRegistryLibraryEventPort();
