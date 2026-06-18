import * as pdfjsLib from "../../../vendor/pdfjs-dist/build/pdf.mjs";
import { resolveResourceUrl } from "../job/artifacts.js";
import {
  defaultReaderPdfDocumentConfigPort,
} from "./config-port.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "../../../vendor/pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

const PDFJS_CMAP_URL = new URL("../../../vendor/pdfjs-dist/cmaps/", import.meta.url).toString();
const PDFJS_STANDARD_FONT_DATA_URL = new URL("../../../vendor/pdfjs-dist/standard_fonts/", import.meta.url).toString();
const READER_RANGE_CHUNK_SIZE = 512 * 1024;

export function resolveReaderArtifactUrl(item) {
  return resolveResourceUrl(item?.resource_url || item?.resource_path || "");
}

export function buildPdfDocumentOptions({
  url,
  configPort = defaultReaderPdfDocumentConfigPort,
} = {}) {
  if (!url) {
    return null;
  }
  return {
    url,
    httpHeaders: configPort.apiHeaders(),
    withCredentials: false,
    disableRange: false,
    disableStream: false,
    rangeChunkSize: READER_RANGE_CHUNK_SIZE,
    cMapUrl: PDFJS_CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: PDFJS_STANDARD_FONT_DATA_URL,
  };
}

export async function loadPdfDocument({
  itemOrUrl,
  configPort = defaultReaderPdfDocumentConfigPort,
}) {
  const url = typeof itemOrUrl === "string" ? itemOrUrl : resolveReaderArtifactUrl(itemOrUrl);
  if (!url) {
    return null;
  }
  return pdfjsLib.getDocument(buildPdfDocumentOptions({ url, configPort })).promise;
}
