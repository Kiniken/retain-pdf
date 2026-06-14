const PROTECTED_ARTIFACT_SELECTOR = [
  "#download-btn",
  "#markdown-bundle-btn",
  "#status-markdown-bundle-btn",
  "#source-pdf-btn",
  "#pdf-btn",
  "#markdown-btn",
  "#markdown-raw-btn",
].join(", ");

export function isActionLinkDisabled(link) {
  return link.classList.contains("disabled") || link.getAttribute("aria-disabled") === "true";
}

export function bindProtectedArtifactLinks(handler) {
  document.addEventListener("click", (event) => {
    const link = event.target?.closest?.(PROTECTED_ARTIFACT_SELECTOR);
    if (!link) {
      return;
    }
    handler(event, link);
  });
}
