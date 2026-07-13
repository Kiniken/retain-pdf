import {
  resolveManifestArtifactUrl,
  resolveResourceUrl,
  resolveSourcePdfDownloadName,
  resolveTranslatedPdfDownloadName,
} from "../job/artifacts.js";
import {
  resolveJobActions,
  resolveJobSourcePdfAction,
} from "../job/actions.js";
import {
  currentJobId,
  currentJobSnapshot,
} from "../features/job-runtime/current-job-state.js";
import { cachedManifestFor } from "../features/job-runtime/secondary-resource-cache.js";

export function createReaderDialogRuntimePort({
  getCurrentJobId = currentJobId,
  getCurrentJobSnapshot = currentJobSnapshot,
  getCachedManifestFor = cachedManifestFor,
  resolveActions = resolveJobActions,
  resolveSourceAction = resolveJobSourcePdfAction,
  resolveManifestUrl = resolveManifestArtifactUrl,
  resolveSourceName = resolveSourcePdfDownloadName,
  resolveTranslatedName = resolveTranslatedPdfDownloadName,
} = {}) {
  function currentJobIdFor(state) {
    return `${getCurrentJobId(state) || ""}`.trim();
  }

  function jobCanUseTranslatedPdfRoute(job, actions) {
    if (actions?.pdfEnabled) {
      return true;
    }
    const workflow = `${job?.workflow || job?.job_type || ""}`.trim().toLowerCase();
    if (workflow === "ocr") {
      return false;
    }
    return `${job?.status || ""}`.trim().toLowerCase() === "succeeded";
  }

  function currentArtifactUrls(state) {
    const requestedJobId = `${state?.readerJobId || ""}`.trim();
    const job = getCurrentJobSnapshot(state);
    const jobId = requestedJobId || job?.job_id || currentJobIdFor(state) || "";
    const manifest = getCachedManifestFor(state, jobId);
    const actions = job ? resolveActions(job) : null;
    const sourcePdfAction = job ? resolveSourceAction(job, manifest) : null;
    const sourcePdf = sourcePdfAction?.url || resolveManifestUrl(manifest, "source_pdf");
    const fallbackTranslatedPdf = jobCanUseTranslatedPdfRoute(job, actions) && jobId
      ? resolveResourceUrl(`/api/v1/jobs/${encodeURIComponent(jobId)}/pdf`)
      : "";
    const translatedPdf = actions?.pdf || resolveManifestUrl(manifest, "pdf")
      || resolveManifestUrl(manifest, "translated_pdf")
      || resolveManifestUrl(manifest, "result_pdf")
      || fallbackTranslatedPdf;
    const sideBySidePdf = sourcePdf && translatedPdf && jobId
      ? resolveResourceUrl(`/api/v1/jobs/${encodeURIComponent(jobId)}/pdf/side-by-side`)
      : "";
    return { sourcePdf, translatedPdf, sideBySidePdf };
  }

  function artifactNameState(state) {
    const job = getCurrentJobSnapshot(state);
    const jobId = `${state?.readerJobId || ""}`.trim() || job?.job_id || currentJobIdFor(state) || "";
    const manifest = getCachedManifestFor(state, jobId);
    return {
      ...state,
      currentJobId: jobId,
      currentJobSnapshot: job || getCurrentJobSnapshot(state) || null,
      currentJobManifestJobId: jobId,
      currentJobManifest: manifest || getCachedManifestFor(state, currentJobIdFor(state)) || null,
    };
  }

  return Object.freeze({
    currentArtifactUrls,
    currentJobId: currentJobIdFor,
    sourcePdfDownloadName: (state, fallback) => resolveSourceName(artifactNameState(state), fallback),
    translatedPdfDownloadName: (state, fallback = "") => resolveTranslatedName(artifactNameState(state), fallback),
  });
}

export const defaultReaderDialogRuntimePort = createReaderDialogRuntimePort();
