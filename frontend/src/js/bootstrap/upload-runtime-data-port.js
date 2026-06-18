import {
  createUploadRuntimeHttpPort,
} from "./upload-runtime-http-port.js";
import {
  createUploadRuntimePdfPort,
} from "./upload-runtime-pdf-port.js";

export function createUploadRuntimeDataPort(overrides = {}) {
  const httpPort = createUploadRuntimeHttpPort(overrides.httpPort);
  const pdfPort = createUploadRuntimePdfPort(overrides.pdfPort);

  return Object.freeze({
    ...httpPort,
    ...pdfPort,
    httpPort,
    pdfPort,
    ...overrides,
  });
}
