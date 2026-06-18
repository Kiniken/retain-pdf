import { PROTECTED_ARTIFACT_SELECTOR } from "./download-actions.js";

export function isActionLinkDisabled(link) {
  return link.classList.contains("disabled") || link.getAttribute("aria-disabled") === "true";
}

export function setActionLinkBusy(link, busy, text = "") {
  if (!link) {
    return;
  }
  const label = link.querySelector("span");
  const labelTarget = label || link;
  if (!link.dataset.defaultLabel) {
    link.dataset.defaultLabel = labelTarget.textContent?.trim() || "下载";
  }
  link.classList.toggle("disabled", busy);
  link.setAttribute("aria-disabled", busy ? "true" : "false");
  labelTarget.textContent = busy ? text || "下载中..." : link.dataset.defaultLabel;
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
