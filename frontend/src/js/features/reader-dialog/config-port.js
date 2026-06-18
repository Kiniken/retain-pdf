import {
  buildFrontendPageUrl,
  isTrustedWindowMessage,
} from "../../config/runtime.js";

export function createReaderDialogConfigPort({
  buildPageUrl = buildFrontendPageUrl,
  trustWindowMessage = isTrustedWindowMessage,
  locationProvider = () => globalThis.window?.location,
} = {}) {
  function buildReaderPageUrl(jobId) {
    const normalizedJobId = `${jobId || ""}`.trim();
    if (!normalizedJobId) {
      return "";
    }
    return buildPageUrl("./reader.html", {
      job_id: normalizedJobId,
    });
  }

  function currentHref() {
    return locationProvider()?.href || "http://127.0.0.1/";
  }

  function buildReaderRouteUrl(jobId) {
    const normalizedJobId = `${jobId || ""}`.trim();
    const url = new URL(currentHref());
    if (!normalizedJobId) {
      url.searchParams.delete("view");
      url.searchParams.delete("job_id");
      return url.toString();
    }
    url.searchParams.set("job_id", normalizedJobId);
    url.searchParams.set("view", "reader");
    return url.toString();
  }

  function requestedReaderJobIdFromLocation() {
    const url = new URL(currentHref());
    const view = `${url.searchParams.get("view") || ""}`.trim();
    const jobId = `${url.searchParams.get("job_id") || ""}`.trim();
    return view === "reader" && jobId ? jobId : "";
  }

  function isTrustedReaderMessage(event, expectedSource = null) {
    return trustWindowMessage(event, expectedSource);
  }

  return Object.freeze({
    buildReaderPageUrl,
    buildReaderRouteUrl,
    isTrustedReaderMessage,
    requestedReaderJobIdFromLocation,
  });
}

export const defaultReaderDialogConfigPort = createReaderDialogConfigPort();
