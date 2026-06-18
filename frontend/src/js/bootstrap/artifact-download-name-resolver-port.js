import {
  resolveSourcePdfDownloadName,
  resolveTranslatedPdfDownloadName,
} from "../job/artifacts.js";

export function createArtifactDownloadNameResolverPort(overrides = {}) {
  return Object.freeze({
    resolveSourcePdfName: resolveSourcePdfDownloadName,
    resolveTranslatedPdfName: resolveTranslatedPdfDownloadName,
    ...overrides,
  });
}
