import { mountGlossariesFeature } from "../features/glossaries/controller.js";

export function createGlossaryControllerMountPort(overrides = {}) {
  return Object.freeze({
    mountGlossariesFeature,
    ...overrides,
  });
}
