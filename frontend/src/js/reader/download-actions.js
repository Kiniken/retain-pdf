import { failDownloadToast } from "../utils/download-feedback.js";
import { buildErrorDiagnostic } from "../utils/error-diagnostics.js";
import {
  downloadProtectedResource,
  summarizeDownloadProgress,
} from "../features/reader-dialog/downloads.js";
import {
  disabledReason,
  READER_DOWNLOAD_ACTIONS,
  resolveReaderDownloadName,
  resolveReaderDownloadUrls,
  trimString,
} from "./downloads/resolve.js";

export { resolveReaderDownloadUrls } from "./downloads/resolve.js";

export function createReaderDownloadActions({
  documentRef = document,
  fetchProtected,
  onStatus = null,
} = {}) {
  let context = {
    jobId: "",
    jobPayload: null,
    manifestPayload: null,
    urls: { source: "", sideBySide: "", translated: "" },
  };

  function buttonFor(action) {
    return documentRef.getElementById(`reader-download-${action}-btn`);
  }

  function closeMenu() {
    const menu = documentRef.querySelector?.(".reader-download-menu");
    if (menu?.open) {
      menu.open = false;
    }
  }

  function setButtonState(action, enabled, url = "", reason = "") {
    const button = buttonFor(action);
    if (!button) {
      return;
    }
    button.disabled = !enabled;
    button.dataset.downloadUrl = enabled ? url : "";
    button.setAttribute("aria-disabled", enabled ? "false" : "true");
    button.title = enabled
      ? `下载${READER_DOWNLOAD_ACTIONS[action]?.label || "PDF"}`
      : reason;
  }

  function sync(nextContext = {}) {
    const has = (key) => Object.prototype.hasOwnProperty.call(nextContext, key);
    const jobId = trimString(has("jobId") ? nextContext.jobId : context.jobId);
    const jobPayload = has("jobPayload") ? nextContext.jobPayload : context.jobPayload;
    const manifestPayload = has("manifestPayload") ? nextContext.manifestPayload : context.manifestPayload;
    const urls = resolveReaderDownloadUrls({ jobId, jobPayload, manifestPayload });
    context = { jobId, jobPayload, manifestPayload, urls };

    Object.keys(READER_DOWNLOAD_ACTIONS).forEach((action) => {
      const url = trimString(urls[action]);
      setButtonState(action, Boolean(url), url, disabledReason(action, urls));
    });
    return context;
  }

  async function handleDownload(action) {
    const descriptor = READER_DOWNLOAD_ACTIONS[action];
    const button = buttonFor(action);
    const url = trimString(button?.dataset?.downloadUrl || context.urls[action]);
    if (!descriptor || !url || button?.disabled) {
      return;
    }
    try {
      const filename = resolveReaderDownloadName(action, context);
      await downloadProtectedResource(
        fetchProtected,
        url,
        filename,
        filename,
        ({ filename: savedName, receivedBytes, totalBytes, percent, done }) => {
          if (typeof onStatus === "function") {
            onStatus(done ? `已开始保存 ${savedName}` : summarizeDownloadProgress(receivedBytes, totalBytes, percent));
          }
        },
        (busy, label) => {
          if (!button) {
            return;
          }
          button.disabled = busy;
          button.setAttribute("aria-disabled", busy ? "true" : "false");
          button.dataset.busy = busy ? "1" : "";
          if (label) {
            button.dataset.busyLabel = label;
          }
        },
      );
    } catch (err) {
      const message = buildErrorDiagnostic(err, {
        operation: descriptor.operation,
        url,
        jobId: context.jobId,
      });
      if (typeof onStatus === "function") {
        onStatus(message);
      }
      failDownloadToast(err.message || "下载失败");
    } finally {
      sync(context);
    }
  }

  function bindEvents() {
    Object.keys(READER_DOWNLOAD_ACTIONS).forEach((action) => {
      buttonFor(action)?.addEventListener("click", () => {
        closeMenu();
        handleDownload(action);
      });
    });
    sync();
  }

  return Object.freeze({
    bindEvents,
    handleDownload,
    sync,
  });
}
