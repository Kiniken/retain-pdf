import { defaultReaderDialogConfigPort } from "./config-port.js";

export function jobIdFromReaderUrl(url) {
  const raw = `${url || ""}`.trim();
  if (!raw) {
    return "";
  }
  try {
    return new URL(raw, window.location.href).searchParams.get("job_id")?.trim() || "";
  } catch (_err) {
    return "";
  }
}

export function currentReaderArtifactUrls(state, runtimePort) {
  return runtimePort?.currentArtifactUrls?.(state) || {};
}

export function buildReaderPageUrl(jobId) {
  return defaultReaderDialogConfigPort.buildReaderPageUrl(jobId);
}

export function buildReaderRouteUrl(jobId) {
  return defaultReaderDialogConfigPort.buildReaderRouteUrl(jobId);
}

export function requestedReaderJobIdFromLocation() {
  return defaultReaderDialogConfigPort.requestedReaderJobIdFromLocation();
}
