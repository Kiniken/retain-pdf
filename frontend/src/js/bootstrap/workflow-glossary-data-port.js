import { fetchGlossaries } from "../api/glossaries.js";

export function createWorkflowGlossaryDataPort(overrides = {}) {
  return Object.freeze({
    fetchGlossaries,
    ...overrides,
  });
}

