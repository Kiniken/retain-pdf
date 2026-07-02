import {
  resolveSourcePdfDownloadName,
  resolveTranslatedPdfDownloadName,
} from "../../job/artifacts.js";
import { createReaderDialogRuntimePort } from "../../bootstrap/reader-dialog-runtime-port.js";
import { resolveReaderSourcePdf } from "../resource-resolver.js";

export const READER_DOWNLOAD_ACTIONS = Object.freeze({
  source: {
    fallbackSuffix: "source",
    label: "原始 PDF",
    operation: "下载原始 PDF",
  },
  sideBySide: {
    fallbackSuffix: "side-by-side",
    label: "对照 PDF",
    operation: "下载对照 PDF",
  },
  translated: {
    fallbackSuffix: "translated",
    label: "译文 PDF",
    operation: "下载译文 PDF",
  },
});

export function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function readerDownloadNameState({ jobId = "", jobPayload = null, manifestPayload = null } = {}) {
  return {
    currentJobId: jobId,
    currentJobManifest: manifestPayload || null,
    currentJobManifestJobId: jobId,
    currentJobSnapshot: jobPayload || null,
  };
}

export function resolveReaderDownloadUrls({ jobId = "", jobPayload = null, manifestPayload = null } = {}) {
  const runtimePort = createReaderDialogRuntimePort({
    getCurrentJobId: (state) => state.currentJobId,
    getCurrentJobSnapshot: (state) => state.currentJobSnapshot,
    getCachedManifestFor: (state) => state.currentJobManifest,
  });
  const {
    translatedPdf,
    sideBySidePdf,
  } = runtimePort.currentArtifactUrls(readerDownloadNameState({ jobId, jobPayload, manifestPayload }));
  const readySourcePdf = resolveReaderSourcePdf(manifestPayload);
  const safeSourcePdf = readySourcePdf || "";
  return {
    source: safeSourcePdf,
    sideBySide: safeSourcePdf && translatedPdf ? sideBySidePdf : "",
    translated: translatedPdf,
  };
}

export function resolveReaderDownloadName(action, { jobId, jobPayload, manifestPayload }) {
  const fallbackName = `${jobId || "result"}-${READER_DOWNLOAD_ACTIONS[action]?.fallbackSuffix || "download"}.pdf`;
  const state = readerDownloadNameState({ jobId, jobPayload, manifestPayload });
  if (action === "source") {
    return resolveSourcePdfDownloadName(state, fallbackName) || fallbackName;
  }
  if (action === "translated") {
    return resolveTranslatedPdfDownloadName(state, fallbackName) || fallbackName;
  }
  return fallbackName;
}

export function disabledReason(action, urls) {
  if (action === "sideBySide" && (!urls.source || !urls.translated)) {
    return "对照 PDF 需要原始 PDF 和译文 PDF 都可用";
  }
  if (!urls.source && (action === "source" || action === "sideBySide")) {
    return "原始 PDF 尚未生成或清单不可用";
  }
  if (!urls.translated && (action === "translated" || action === "sideBySide")) {
    return "译文 PDF 尚未生成或清单不可用";
  }
  return "下载地址暂不可用";
}
