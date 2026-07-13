import { failDownloadToast } from "../../utils/download-feedback.js";
import { buildErrorDiagnostic } from "../../utils/error-diagnostics.js";
import {
  downloadProtectedResource,
  summarizeDownloadProgress,
} from "./downloads.js";
import {
  buildReaderPageUrl,
  buildReaderRouteUrl,
  jobIdFromReaderUrl,
  requestedReaderJobIdFromLocation,
} from "./routing.js";
import {
  READER_DIALOG_BUTTON_IDS,
  READER_DIALOG_COPY,
  READER_DIALOG_MESSAGES,
} from "./contract.js";
import { defaultReaderDialogConfigPort } from "./config-port.js";
import { createReaderDialogViewPort } from "./view-port.js";

export function mountReaderDialogFeature({
  state,
  fetchProtected,
  setText,
  configPort = defaultReaderDialogConfigPort,
  runtimePort,
  viewPort = createReaderDialogViewPort(),
}) {
  let activeReaderJobId = "";
  const progressState = {
    value: 0,
    target: 0,
    rafId: 0,
  };

  function syncReaderRoute(jobId = "") {
    window.history.replaceState(window.history.state, "", buildReaderRouteUrl(jobId));
  }

  function setLoading(loading) {
    viewPort.setLoadingVisible(loading);
  }

  function setLoadingProgress(percent = 0, text = "正在准备对照阅读…") {
    viewPort.setLoadingProgress(progressState, percent, text);
  }

  function syncToolbarActions() {
    const { sourcePdf, translatedPdf, sideBySidePdf } = runtimePort.currentArtifactUrls({
      ...state,
      readerJobId: activeReaderJobId,
    });
    viewPort.setToolbarButtonState(READER_DIALOG_BUTTON_IDS.source, !!sourcePdf, sourcePdf);
    viewPort.setToolbarButtonState(READER_DIALOG_BUTTON_IDS.translated, !!translatedPdf, translatedPdf);
    viewPort.setToolbarButtonState(READER_DIALOG_BUTTON_IDS.merged, !!sideBySidePdf, sideBySidePdf);
  }

  async function handleSourceDownload() {
    const url = viewPort.toolbarButtonUrl(READER_DIALOG_BUTTON_IDS.source);
    if (!url) {
      return;
    }
    try {
      const jobId = runtimePort.currentJobId(state) || "result";
      const preferredName = runtimePort.sourcePdfDownloadName(state, `${jobId}-source.pdf`);
      await downloadProtectedResource(
        fetchProtected,
        url,
        `${jobId}-source.pdf`,
        preferredName,
        ({ filename, receivedBytes, totalBytes, percent, done }) => {
          setText("error-box", done ? `已开始保存 ${filename}` : summarizeDownloadProgress(receivedBytes, totalBytes, percent));
        },
        (busy, label) => viewPort.setButtonBusy(READER_DIALOG_BUTTON_IDS.source, busy, label),
      );
    } catch (err) {
      setText("error-box", buildErrorDiagnostic(err, {
        operation: "下载原始 PDF",
        url,
        jobId: activeReaderJobId || runtimePort.currentJobId(state),
      }));
      failDownloadToast(err.message || "下载失败");
    } finally {
      syncToolbarActions();
    }
  }

  async function handleTranslatedDownload() {
    const url = viewPort.toolbarButtonUrl(READER_DIALOG_BUTTON_IDS.translated);
    if (!url) {
      return;
    }
    try {
      const jobId = runtimePort.currentJobId(state) || "result";
      const preferredName = runtimePort.translatedPdfDownloadName(state, "");
      await downloadProtectedResource(
        fetchProtected,
        url,
        `${jobId}-translated.pdf`,
        preferredName,
        ({ filename, receivedBytes, totalBytes, percent, done }) => {
          setText("error-box", done ? `已开始保存 ${filename}` : summarizeDownloadProgress(receivedBytes, totalBytes, percent));
        },
        (busy, label) => viewPort.setButtonBusy(READER_DIALOG_BUTTON_IDS.translated, busy, label),
      );
    } catch (err) {
      setText("error-box", buildErrorDiagnostic(err, {
        operation: "下载译文 PDF",
        url,
        jobId: activeReaderJobId || runtimePort.currentJobId(state),
      }));
      failDownloadToast(err.message || "下载失败");
    } finally {
      syncToolbarActions();
    }
  }

  async function handleMergedDownload() {
    const { sideBySidePdf } = runtimePort.currentArtifactUrls(state);
    if (!sideBySidePdf) {
      return;
    }
    try {
      const jobId = runtimePort.currentJobId(state) || "result";
      const filename = `${jobId}-side-by-side.pdf`;
      await downloadProtectedResource(
        fetchProtected,
        sideBySidePdf,
        filename,
        filename,
        ({ filename: savedFilename, receivedBytes, totalBytes, percent, done }) => {
          setText("error-box", done ? `已开始保存 ${savedFilename}` : summarizeDownloadProgress(receivedBytes, totalBytes, percent));
        },
        (busy, label) => viewPort.setButtonBusy(READER_DIALOG_BUTTON_IDS.merged, busy, label),
      );
    } catch (err) {
      setText("error-box", buildErrorDiagnostic(err, {
        operation: "下载对照 PDF",
        url: sideBySidePdf,
        jobId: activeReaderJobId || runtimePort.currentJobId(state),
      }));
      failDownloadToast(err.message || "下载失败");
    } finally {
      syncToolbarActions();
    }
  }

  function resolveOpenArgs(input) {
    if (typeof input === "string") {
      return {
        url: buildReaderPageUrl(input),
        jobId: `${input || ""}`.trim(),
        disabled: false,
      };
    }
    if (input?.jobId || input?.url || typeof input?.disabled === "boolean") {
      const jobId = `${input?.jobId || ""}`.trim() || jobIdFromReaderUrl(input?.url);
      return {
        url: `${input?.url || buildReaderPageUrl(jobId, input?.anchor || null)}`.trim(),
        jobId,
        disabled: !!input?.disabled,
      };
    }
    const { url, disabled } = viewPort.linkOpenState(input);
    let jobId = runtimePort.currentJobId(state);
    if (!jobId && url) {
      try {
        jobId = new URL(url, window.location.href).searchParams.get("job_id")?.trim() || "";
      } catch (_err) {
        jobId = "";
      }
    }
    return {
      url,
      jobId,
      disabled,
    };
  }

  function open(input) {
    const { url, jobId, disabled } = resolveOpenArgs(input);
    if (input?.preventDefault) {
      input.preventDefault();
    }
    if (disabled || !url || !jobId) {
      return;
    }
    activeReaderJobId = jobId;
    syncReaderRoute(jobId);
    setLoading(true);
    setLoadingProgress(8, READER_DIALOG_COPY.preparing);
    viewPort.setFrameSource(url);
    syncToolbarActions();
    viewPort.openDialog();
  }

  function close() {
    activeReaderJobId = "";
    viewPort.closeDialog();
    setLoading(false);
    setLoadingProgress(0, READER_DIALOG_COPY.preparing);
    viewPort.setToolbarButtonState(READER_DIALOG_BUTTON_IDS.source, false);
    viewPort.setToolbarButtonState(READER_DIALOG_BUTTON_IDS.translated, false);
    viewPort.setToolbarButtonState(READER_DIALOG_BUTTON_IDS.merged, false);
    syncReaderRoute("");
    viewPort.setFrameSource("about:blank");
  }

  function bindEvents() {
    viewPort.bindEvents({
      onClose: close,
      onSourceDownload: handleSourceDownload,
      onMergedDownload: handleMergedDownload,
      onTranslatedDownload: handleTranslatedDownload,
      onFrameLoad() {
        window.setTimeout(() => {
          if (viewPort.loadedFrame()) {
            setLoading(false);
          }
        }, 1200);
      },
    });
    window.addEventListener("message", (event) => {
      if (!configPort.isTrustedReaderMessage(event, viewPort.frameWindow())) {
        return;
      }
      const data = event.data;
      if (!data || data.type !== READER_DIALOG_MESSAGES.progress) {
        return;
      }
      setLoading(true);
      setLoadingProgress(data.percent, data.text);
      if (Number(data.percent) >= 100 && data.stage === "ready") {
        window.setTimeout(() => {
          setLoading(false);
        }, 180);
      }
    });
  }

  return {
    bindEvents,
    close,
    getRequestedJobIdFromLocation: requestedReaderJobIdFromLocation,
    open,
    syncToolbarActions,
  };
}
