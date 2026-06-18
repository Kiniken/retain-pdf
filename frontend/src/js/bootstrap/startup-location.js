export function getRequestedReaderJobIdFromLocation() {
  const url = new URL(window.location.href);
  const view = `${url.searchParams.get("view") || ""}`.trim();
  const jobId = `${url.searchParams.get("job_id") || ""}`.trim();
  return view === "reader" && jobId ? jobId : "";
}

export function getRequestedJobIdFromLocation() {
  const url = new URL(window.location.href);
  return `${url.searchParams.get("job_id") || ""}`.trim();
}
