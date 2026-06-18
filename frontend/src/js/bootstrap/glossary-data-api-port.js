import {
  createGlossary,
  deleteGlossary,
  exportGlossaryCsv,
  fetchGlossaries,
  fetchGlossary,
  parseGlossaryCsv,
  updateGlossary,
} from "../api/glossaries.js";

export function createGlossaryDataApiPort(overrides = {}) {
  return Object.freeze({
    createGlossary,
    deleteGlossary,
    exportGlossaryCsv,
    fetchGlossaries,
    fetchGlossary,
    parseGlossaryCsv,
    updateGlossary,
    ...overrides,
  });
}
