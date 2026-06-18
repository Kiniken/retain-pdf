import {
  fetchTranslationDiagnostics,
  fetchTranslationItem,
  fetchTranslationItems,
  replayTranslationItem,
} from "../api/translation-debug.js";

export function createJobTranslationDebugDataPort(overrides = {}) {
  return Object.freeze({
    fetchTranslationDiagnostics,
    fetchTranslationItem,
    fetchTranslationItems,
    replayTranslationItem,
    ...overrides,
  });
}
