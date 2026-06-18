import { hasReadyManifestArtifact } from "./artifacts.js";
import {
  resolveJobActions,
  resolveJobSourcePdfAction,
} from "./actions.js";

function currentWindowHref() {
  return typeof window !== "undefined" && window.location?.href
    ? window.location.href
    : "http://127.0.0.1/";
}

export function buildReaderPageUrl(jobId) {
  const normalizedJobId = `${jobId || ""}`.trim();
  if (!normalizedJobId) {
    return "";
  }
  const url = new URL("./reader.html", currentWindowHref());
  url.searchParams.set("job_id", normalizedJobId);
  return url.toString();
}

export function isReaderActionEnabled(job, manifestPayload = null) {
  const actions = resolveJobActions(job);
  const sourcePdfAction = resolveJobSourcePdfAction(job, manifestPayload);
  return Boolean(
    job?.job_id
    && sourcePdfAction.ready
    && (hasReadyManifestArtifact(manifestPayload, "pdf")
      || hasReadyManifestArtifact(manifestPayload, "translated_pdf")
      || hasReadyManifestArtifact(manifestPayload, "result_pdf")
      || actions.pdfEnabled),
  );
}
