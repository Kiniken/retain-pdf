const PDFJS_MODULE_URL = new URL("../../../vendor/pdfjs-dist/build/pdf.mjs", import.meta.url).toString();
const PDFJS_CMAP_URL = new URL("../../../vendor/pdfjs-dist/cmaps/", import.meta.url).toString();
const PDFJS_STANDARD_FONT_DATA_URL = new URL("../../../vendor/pdfjs-dist/standard_fonts/", import.meta.url).toString();
const PDFJS_WORKER_URL = new URL("../../../vendor/pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

let pdfjsPromise = null;

async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(PDFJS_MODULE_URL)
      .then((module) => {
        module.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        return module;
      })
      .catch((error) => {
        pdfjsPromise = null;
        throw error;
      });
  }
  return pdfjsPromise;
}

export async function countPdfPages(file) {
  if (!file) {
    return 0;
  }
  const pdfjsLib = await loadPdfjs();
  const doc = await pdfjsLib.getDocument({
    data: await file.arrayBuffer(),
    cMapUrl: PDFJS_CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: PDFJS_STANDARD_FONT_DATA_URL,
    disableFontFace: true,
    disableRange: true,
    disableStream: true,
  }).promise;
  try {
    return Number(doc?.numPages || 0);
  } finally {
    if (doc?.destroy) {
      await doc.destroy().catch(() => {});
    }
  }
}
