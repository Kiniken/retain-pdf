import { withTimeout } from "../../utils/async-timeout.js";
import { buildErrorDiagnostic } from "../../utils/error-diagnostics.js";
import {
  resolveSubmitReadiness,
  SUBMIT_BLOCK_REASONS,
} from "../../contracts/submit-readiness-contract.js";
import { APP_EVENTS } from "../../contracts/app-contract.js";

export const DEEPSEEK_BALANCE_CHECK_TIMEOUT_MS = 12000;

export function needsDeepSeekBudgetCheck({
  workflow,
  workflowNeedsUpload,
  currentBudgetState,
} = {}) {
  const budget = currentBudgetState?.();
  return Boolean(workflowNeedsUpload?.(workflow)) && Boolean(budget?.visible);
}

export async function ensureDeepSeekBudgetReady({
  workflow,
  workflowNeedsUpload,
  currentBudgetState,
  refreshDeepSeekBalance,
  setText,
  timeoutMs = DEEPSEEK_BALANCE_CHECK_TIMEOUT_MS,
} = {}) {
  if (!needsDeepSeekBudgetCheck({ workflow, workflowNeedsUpload, currentBudgetState })) {
    return true;
  }
  setText("error-box", "正在检测 DeepSeek 余额…");
  try {
    const result = await withTimeout(
      refreshDeepSeekBalance?.({ silent: true }) || Promise.resolve(null),
      timeoutMs,
      "DeepSeek 余额检测超时，请稍后重试或在接口设置中检测。",
    );
    if (result?.status === "missing_key") {
      setText("error-box", "请先填写 DeepSeek API Key。");
      return false;
    }
    if (result?.status === "network_error") {
      setText("error-box", "DeepSeek 余额检测失败，请稍后重试或在接口设置中检测。");
      return false;
    }
  } catch (error) {
    setText("error-box", error?.message || "DeepSeek 余额检测失败，请稍后重试。");
    return false;
  }
  const budget = currentBudgetState?.();
  if (budget?.blocking) {
    setText("error-box", `余额不足：${budget.message}。请充值后再提交。`);
    return false;
  }
  if (budget?.visible && !budget.balanceChecked) {
    setText("error-box", "无法确认 DeepSeek 余额，请先在接口设置中完成检测。");
    return false;
  }
  return true;
}

export function currentSubmitReadiness({
  workflow,
  configPort,
  desktopMode,
  desktopConfigured,
  uploadId,
  currentRenderSourceJobId,
  hasBrowserCredentials,
  workflowNeedsUpload,
  workflowNeedsCredentials,
  currentBudgetState,
} = {}) {
  return resolveSubmitReadiness({
    workflow,
    isMock: Boolean(configPort?.isMock?.()),
    desktopMode,
    desktopConfigured,
    uploadId,
    renderSourceJobId: currentRenderSourceJobId?.(),
    hasBrowserCredentials: Boolean(hasBrowserCredentials?.()),
    needsUpload: workflowNeedsUpload?.(workflow),
    needsCredentials: workflowNeedsCredentials?.(workflow),
    budgetBlocking: Boolean(currentBudgetState?.()?.blocking),
  });
}

export function handleSubmitReadinessBlock({
  readiness,
  openSetupDialog,
  openBrowserCredentialsDialog,
  currentBudgetState,
  setText,
} = {}) {
  switch (readiness?.reason) {
    case SUBMIT_BLOCK_REASONS.DESKTOP_NOT_CONFIGURED:
      openSetupDialog?.();
      setText("error-box", "请先完成首次配置。");
      return true;
    case SUBMIT_BLOCK_REASONS.MISSING_CREDENTIALS:
      setText("error-box", "请先填写当前 OCR Provider 凭证。");
      openBrowserCredentialsDialog?.();
      return true;
    case SUBMIT_BLOCK_REASONS.MISSING_UPLOAD:
      setText("error-box", "请先选择并上传 PDF 文件");
      return true;
    case SUBMIT_BLOCK_REASONS.MISSING_RENDER_SOURCE:
      setText("error-box", "请先在开发者设置里填写 Render 源任务 ID。");
      return true;
    case SUBMIT_BLOCK_REASONS.BUDGET_BLOCKING: {
      const budget = currentBudgetState?.();
      setText("error-box", `余额不足：${budget?.message || "请充值后再提交"}。请充值后再提交。`);
      return true;
    }
    default:
      return false;
  }
}

export async function ensureOcrCredentialsForSubmit({
  workflow,
  desktopMode,
  workflowNeedsCredentials,
  ensureOcrCredentialsReady,
  openBrowserCredentialsDialog,
  setText,
} = {}) {
  if (!workflowNeedsCredentials?.(workflow)) {
    return true;
  }
  return Boolean(await ensureOcrCredentialsReady?.({
    onMissingToken: () => {
      setText("error-box", "请先填写当前 OCR Provider 凭证。");
      if (!desktopMode) {
        openBrowserCredentialsDialog?.();
      }
    },
    onInvalidToken: (result) => {
      setText("error-box", result.summary || "OCR Provider 凭证校验未通过。");
      if (!desktopMode) {
        openBrowserCredentialsDialog?.();
      }
    },
  }));
}

export function publishSubmitSuccess({
  payload,
  state,
  renderJob,
  syncCurrentJobSnapshot,
  startJobPolling,
  libraryEventPort,
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  now = () => new Date().toISOString(),
} = {}) {
  libraryEventPort?.publishJobCreated?.(payload);
  [200, 1500, 4000].forEach((delay) => {
    windowRef?.setTimeout?.(() => {
      libraryEventPort?.requestRefresh?.({ delay: 0, force: true });
    }, delay);
  });
  const EventCtor = documentRef?.defaultView?.CustomEvent || globalThis.CustomEvent;
  const openWorkflowEvent = typeof EventCtor === "function"
    ? new EventCtor(APP_EVENTS.openTranslationWorkflow)
    : { type: APP_EVENTS.openTranslationWorkflow };
  documentRef?.dispatchEvent?.(openWorkflowEvent);
  syncCurrentJobSnapshot?.(state, payload, payload?.job_id || "", {
    startedAt: now(),
  });
  renderJob?.(payload);
  startJobPolling?.(payload?.job_id);
}

export async function runSubmitFlow({
  workflow,
  desktopMode,
  configPort,
  state,
  apiPrefix,
  uploadId,
  desktopConfigured,
  openSetupDialog,
  openBrowserCredentialsDialog,
  setText,
  submitJobRequest,
  workflowNeedsUpload,
  workflowNeedsCredentials,
  currentRenderSourceJobId,
  currentBudgetState,
  collectRunPayload,
  validateBeforeSubmit,
  ensureOcrCredentialsReady,
  hasBrowserCredentials,
  refreshDeepSeekBalance,
  syncCurrentJobSnapshot,
  renderJob,
  startJobPolling,
  libraryEventPort,
  isMissingUploadError,
  handleMissingUploadError,
  documentRef,
  windowRef,
  now,
} = {}) {
  if (configPort?.isMock?.()) {
    setText("error-box", "-");
    const payload = await submitJobRequest(apiPrefix, { workflow, source: {}, mock: true });
    publishSubmitSuccess({
      payload,
      state,
      renderJob,
      syncCurrentJobSnapshot,
      startJobPolling,
      libraryEventPort,
      documentRef,
      windowRef,
      now,
    });
    return { status: "submitted", payload, mock: true };
  }

  const readiness = currentSubmitReadiness({
    workflow,
    configPort,
    desktopMode,
    desktopConfigured,
    uploadId,
    currentRenderSourceJobId,
    hasBrowserCredentials,
    workflowNeedsUpload,
    workflowNeedsCredentials,
    currentBudgetState,
  });
  if (!readiness.ready) {
    handleSubmitReadinessBlock({
      readiness,
      openSetupDialog,
      openBrowserCredentialsDialog,
      currentBudgetState,
      setText,
    });
    return { status: "blocked", readiness };
  }
  if (!validateBeforeSubmit?.()) {
    return { status: "invalid_page_ranges" };
  }
  if (!(await ensureDeepSeekBudgetReady({
    workflow,
    workflowNeedsUpload,
    currentBudgetState,
    refreshDeepSeekBalance,
    setText,
  }))) {
    return { status: "budget_not_ready" };
  }
  if (!(await ensureOcrCredentialsForSubmit({
    workflow,
    desktopMode,
    workflowNeedsCredentials,
    ensureOcrCredentialsReady,
    openBrowserCredentialsDialog,
    setText,
  }))) {
    return { status: "ocr_credentials_not_ready" };
  }

  setText("error-box", "-");

  try {
    const runPayload = collectRunPayload?.();
    const payload = await submitJobRequest(apiPrefix, runPayload);
    publishSubmitSuccess({
      payload,
      state,
      renderJob,
      syncCurrentJobSnapshot,
      startJobPolling,
      libraryEventPort,
      documentRef,
      windowRef,
      now,
    });
    return { status: "submitted", payload, mock: false };
  } catch (err) {
    if (isMissingUploadError?.(err)) {
      handleMissingUploadError?.();
      return { status: "missing_upload", error: err };
    }
    setText("error-box", buildErrorDiagnostic(err, {
      operation: "提交 PDF 任务",
      url: `${apiPrefix || ""}/jobs`,
      details: {
        workflow,
        upload_id: uploadId,
        render_source_job_id: currentRenderSourceJobId?.(),
      },
    }));
    return { status: "error", error: err };
  }
}
