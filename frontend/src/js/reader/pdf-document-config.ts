import { buildApiHeaders } from "../config/runtime.js";

export function createReaderPdfDocumentConfigPort({
  buildHeaders = buildApiHeaders,
} = {}) {
  function apiHeaders() {
    return buildHeaders();
  }

  return Object.freeze({
    apiHeaders,
  });
}

export const defaultReaderPdfDocumentConfigPort = createReaderPdfDocumentConfigPort();
