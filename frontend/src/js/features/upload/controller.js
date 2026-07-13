import { withTimeout } from "../../utils/async-timeout.js";
import { buildErrorDiagnostic } from "../../utils/error-diagnostics.js";
import { getUploadStatePort } from "./state.js";
import { defaultUploadConfigPort } from "./config-port.js";
import { createUploadViewPort } from "./upload-view-port.js";

export function mountUploadFeature({
  state,
  uploadStatePort,
  apiBase,
  apiPrefix,
  frontMaxBytes,
  frontMaxPageCount,
  countPdfPages,
  defaultFileLabel,
  collectUploadFormData,
  submitUploadRequest,
  resetUploadedFile,
  resetUploadProgress,
  setUploadProgress,
  clearFileInputValue,
  setText,
  applyWorkflowMode,
  refreshSubmitControls,
  refreshDeepSeekBalance,
  workflowNeedsUpload,
  configPort = defaultUploadConfigPort,
  viewPort = createUploadViewPort(),
}) {
  const BALANCE_CHECK_TIMEOUT_MS = 12000;
  const uploadState = uploadStatePort || getUploadStatePort();

  function readUploadState() {
    return uploadState.getSnapshot?.() || {};
  }

  function updateUploadState(payload = {}) {
    return uploadState.setUpload?.(payload) || readUploadState();
  }

  function updateAppliedPageRange(value = "") {
    return uploadState.setAppliedPageRange?.(value) || readUploadState();
  }

  function resetAppliedPageRange() {
    return uploadState.clearAppliedPageRange?.() || readUploadState();
  }

  function resetUploadSession() {
    const snapshot = uploadState.reset?.() || readUploadState();
    resetUploadedFile?.();
    resetUploadProgress?.();
    clearFileInputValue?.();
    viewPort.clearPageRanges();
    viewPort.markUploadReady(false);
    renderPageRangeSummary();
    refreshSubmitControls();
    return snapshot;
  }

  function formatByteLimit(bytes) {
    const mb = Number(bytes) / (1024 * 1024);
    return Number.isFinite(mb) && mb > 0 ? `${Math.round(mb)}MB` : "当前";
  }

  function normalizePageRangeValue(startValue = "", endValue = "") {
    const start = startValue.trim();
    const end = endValue.trim();
    if (!start && !end) {
      return "";
    }
    if (start && end) {
      return start === end ? start : `${start}-${end}`;
    }
    return start || end;
  }

  function currentPageRanges() {
    const { start, end } = viewPort.readPageRanges();
    return normalizePageRangeValue(start, end);
  }

  function pageRangeLimit() {
    const snapshot = readUploadState();
    return Number(snapshot.uploadedPageCount || 0) || frontMaxPageCount || 0;
  }

  function normalizePageNumberInput(value) {
    const text = `${value ?? ""}`.trim();
    if (!text) {
      return "";
    }
    const page = Number(text);
    if (!Number.isFinite(page)) {
      return "";
    }
    return Math.max(1, Math.trunc(page));
  }

  function constrainPageRanges({ source = "" } = {}) {
    const { start: rawStart, end: rawEnd } = viewPort.readPageRanges();
    const maxPage = pageRangeLimit();
    let start = normalizePageNumberInput(rawStart);
    let end = normalizePageNumberInput(rawEnd);

    if (maxPage > 0) {
      if (start !== "") {
        start = Math.min(start, maxPage);
      }
      if (end !== "") {
        end = Math.min(end, maxPage);
      }
    }

    if (start !== "" && end !== "" && start > end) {
      if (source === "end") {
        end = start;
      } else {
        start = end;
      }
    }

    const next = {
      start: start === "" ? "" : `${start}`,
      end: end === "" ? "" : `${end}`,
    };
    viewPort.writePageRanges(next);
    updateAppliedPageRange(normalizePageRangeValue(next.start, next.end));
    refreshSubmitControls();
    return { ...next, maxPage };
  }

  function validatePageRanges() {
    const { start: rawStart, end: rawEnd } = viewPort.readPageRanges();
    const start = rawStart.trim();
    const end = rawEnd.trim();
    const maxPage = pageRangeLimit();
    if ((start && Number(start) < 1) || (end && Number(end) < 1)) {
      setText("error-box", "页码必须从 1 开始");
      return false;
    }
    if ((start && maxPage && Number(start) > maxPage) || (end && maxPage && Number(end) > maxPage)) {
      setText("error-box", `页码不能超过 ${maxPage}`);
      return false;
    }
    if (start && end && Number(start) > Number(end)) {
      setText("error-box", "起始页不能大于结束页");
      return false;
    }
    if (maxPage && start && end && Number(end) - Number(start) + 1 > maxPage) {
      setText("error-box", `页码区间不能超过 ${maxPage} 页`);
      return false;
    }
    updateAppliedPageRange(normalizePageRangeValue(start, end));
    return true;
  }

  function renderPageRangeSummary() {
    const snapshot = readUploadState();
    viewPort.setInlinePageRangeVisible(workflowNeedsUpload() && Boolean(snapshot.uploadId));
  }

  function openPageRangeDialog() {
    const snapshot = readUploadState();
    viewPort.openPageRangeDialog({
      applied: snapshot.appliedPageRange || "",
      maxPage: pageRangeLimit(),
    });
  }

  function applyPageRanges() {
    viewPort.closePageRangeDialog();
  }

  function clearPageRanges() {
    viewPort.clearPageRanges();
    resetAppliedPageRange();
    renderPageRangeSummary();
    refreshSubmitControls();
    viewPort.closePageRangeDialog();
  }

  async function handleFileSelected() {
    const file = viewPort.selectedFile();
    uploadState.reset?.();
    resetUploadedFile();
    resetUploadProgress();
    viewPort.clearPageRanges();
    renderPageRangeSummary();
    applyWorkflowMode();
    viewPort.setFileLabel(file, defaultFileLabel);
    if (!file) {
      return;
    }
    if (file.size > frontMaxBytes) {
      setText("error-box", `当前前端限制为 ${formatByteLimit(frontMaxBytes)} 以内 PDF`);
      viewPort.showUploadStatus("文件超出大小限制");
      return;
    }
    if (frontMaxPageCount && countPdfPages) {
      viewPort.showUploadStatus("正在校验页数…");
      try {
        const localPageCount = await countPdfPages(file);
        if (!Number.isFinite(localPageCount) || localPageCount <= 0) {
          setText("error-box", "PDF 解析失败，请检查文件是否损坏或可访问性异常。");
          viewPort.showUploadStatus("文件校验失败");
          clearFileInputValue();
          return;
        }
        if (localPageCount > frontMaxPageCount) {
          setText("error-box", `PDF 页数超过限制：最多 ${frontMaxPageCount} 页`);
          viewPort.showUploadStatus("文件超出页数限制");
          clearFileInputValue();
          return;
        }
      } catch (err) {
        setText("error-box", buildErrorDiagnostic(err, {
          operation: "校验 PDF 文件",
          details: {
            file_name: file.name,
            file_size: file.size,
            max_pages: frontMaxPageCount,
          },
        }));
        viewPort.showUploadStatus("文件校验失败");
        clearFileInputValue();
        return;
      }
    }
    setText("error-box", "-");
    viewPort.showUploadStatus("正在上传…");

    const uploadUrl = configPort.buildUploadUrl(apiPrefix);
    try {
      const payload = await submitUploadRequest(
        uploadUrl,
        collectUploadFormData(file),
        setUploadProgress,
      );
      const uploadedPageCount = Number(payload.page_count || 0);
      if (frontMaxPageCount > 0 && uploadedPageCount > frontMaxPageCount) {
        setText("error-box", `PDF 页数超过限制：最多 ${frontMaxPageCount} 页`);
        viewPort.showUploadStatus("文件超出页数限制");
        clearFileInputValue();
        resetUploadedFile();
        return;
      }
      const snapshot = updateUploadState({
        uploadId: payload.upload_id || "",
        uploadedFileName: payload.filename || file.name,
        uploadedPageCount,
        uploadedBytes: Number(payload.bytes || file.size || 0),
      });
      viewPort.writePageRanges({
        start: uploadedPageCount > 0 ? "1" : "",
        end: uploadedPageCount > 0 ? `${uploadedPageCount}` : "",
      });
      updateAppliedPageRange(currentPageRanges());
      viewPort.markUploadReady(!!snapshot.uploadId);
      viewPort.showUploadStatus("上传完成，可以开始任务。");
      clearFileInputValue();
      renderPageRangeSummary();
      refreshSubmitControls();
      if (refreshDeepSeekBalance) {
        viewPort.showUploadStatus("上传完成，正在检测余额…");
        void withTimeout(
          refreshDeepSeekBalance({ silent: true }),
          BALANCE_CHECK_TIMEOUT_MS,
          "DeepSeek 余额检测超时",
        )
          .then((result) => {
            const status = `${result?.status || ""}`;
            if (status === "network_error" || status === "missing_key") {
              viewPort.showUploadStatus("上传完成，余额未确认，提交前会再次检测。");
              return;
            }
            viewPort.showUploadStatus("上传完成，可以开始任务。");
          })
          .catch(() => {
            viewPort.showUploadStatus("上传完成，余额未确认，提交前会再次检测。");
          })
          .finally(() => {
            refreshSubmitControls();
          });
      }
    } catch (err) {
      resetUploadedFile();
      clearFileInputValue();
      setText("error-box", buildErrorDiagnostic(err, {
        operation: "上传 PDF 文件",
        url: uploadUrl,
        details: {
          file_name: file.name,
          file_size: file.size,
          max_pages: frontMaxPageCount,
        },
      }));
      viewPort.showUploadStatus("上传失败");
      applyWorkflowMode();
    }
  }

  return {
    applyPageRanges,
    clearPageRanges,
    constrainPageRanges,
    currentPageRanges,
    handleFileSelected,
    normalizePageRangeValue,
    openPageRangeDialog,
    renderPageRangeSummary,
    resetUploadSession,
    validatePageRanges,
  };
}
