import {
  runSubmitFlow,
} from "./submit-flow.js";
import { defaultAppActionsConfigPort } from "./config-port.js";
import { createAppActionsViewPort } from "./action-view-port.js";
import { createAppActionsRuntimeEnvPort } from "./runtime-env-port.js";
import { createAppActionsJobSnapshotPort } from "./job-snapshot-port.js";
import { createAppActionsUploadStatePort } from "./upload-state-port.js";

export function mountAppActionsFeature({
  state,
  uploadStatePort,
  runtimeEnvPort,
  jobSnapshotPort,
  viewPort = createAppActionsViewPort(),
  apiBase,
  apiPrefix,
  buildApiEndpoint,
  setText,
  openDesktopOutputDirectory,
  resetUploadedFile,
  submitFlow,
  openSetupDialog = submitFlow?.openSetupDialog,
  renderJob = submitFlow?.renderJob,
  submitJobRequest = submitFlow?.submitJobRequest,
  currentWorkflow = submitFlow?.currentWorkflow,
  workflowNeedsCredentials = submitFlow?.workflowNeedsCredentials,
  workflowNeedsUpload = submitFlow?.workflowNeedsUpload,
  currentRenderSourceJobId = submitFlow?.currentRenderSourceJobId,
  currentBudgetState = submitFlow?.currentBudgetState,
  collectRunPayload = submitFlow?.collectRunPayload,
  validateBeforeSubmit = submitFlow?.validateBeforeSubmit,
  ensureOcrCredentialsReady = submitFlow?.ensureOcrCredentialsReady,
  hasBrowserCredentials = submitFlow?.hasBrowserCredentials,
  openBrowserCredentialsDialog = submitFlow?.openBrowserCredentialsDialog,
  refreshDeepSeekBalance = submitFlow?.refreshDeepSeekBalance,
  startJobPolling = submitFlow?.startJobPolling,
  libraryEventPort = submitFlow?.libraryEventPort,
  jobSnapshotPort: submitFlowJobSnapshotPort = submitFlow?.jobSnapshotPort,
  configPort = apiBase
    ? {
      apiBaseLabel: apiBase,
      isMock: defaultAppActionsConfigPort.isMock,
    }
    : defaultAppActionsConfigPort,
}) {
  const uploadState = uploadStatePort || createAppActionsUploadStatePort(state);
  const runtimeEnv = runtimeEnvPort || createAppActionsRuntimeEnvPort(state);
  const jobSnapshot = jobSnapshotPort || submitFlowJobSnapshotPort || createAppActionsJobSnapshotPort(state);

  function readUploadState() {
    return uploadState.getSnapshot?.() || {};
  }

  function setSubmitBusyState(busy) {
    if (uploadState.setSubmitBusy) {
      uploadState.setSubmitBusy(busy);
    } else {
      state.submitBusy = !!busy;
    }
    viewPort.setSubmitBusyState(busy);
  }

  function isMissingUploadError(error) {
    const message = `${error?.message || error || ""}`;
    return message.includes("upload not found");
  }

  function handleMissingUploadError() {
    viewPort.resetMissingUpload({ state, uploadStatePort: uploadState, resetUploadedFile, setText });
  }

  async function submitForm(event) {
    event.preventDefault();
    const workflow = currentWorkflow();
    const desktopMode = runtimeEnv.isDesktopMode();
    setSubmitBusyState(true);
    try {
      const uploadSnapshot = readUploadState();
      await runSubmitFlow({
        workflow,
        desktopMode,
        configPort,
        state,
        apiPrefix,
        uploadId: uploadSnapshot.uploadId,
        desktopConfigured: runtimeEnv.isDesktopConfigured(),
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
        syncCurrentJobSnapshot: (_state, payload, jobId, meta) => {
          jobSnapshot.syncCurrentJobSnapshot(payload, jobId, meta);
        },
        renderJob,
        startJobPolling,
        libraryEventPort,
        isMissingUploadError,
        handleMissingUploadError,
      });
    } finally {
      setSubmitBusyState(false);
    }
  }

  async function checkApiConnectivity() {
    try {
      const resp = await fetch(buildApiEndpoint("", "health"));
      if (!resp.ok) {
        throw new Error(`health ${resp.status}`);
      }
      return true;
    } catch (_err) {
      const message = `当前前端无法连接后端。API Base: ${configPort.apiBaseLabel()}。请确认本地服务已经启动，然后重试。`;
      setText("error-box", message);
      throw new Error(message);
    }
  }

  async function handleOpenOutputDir() {
    try {
      await openDesktopOutputDirectory();
    } catch (err) {
      setText("error-box", err.message || String(err));
    }
  }

  return {
    checkApiConnectivity,
    handleOpenOutputDir,
    submitForm,
  };
}
