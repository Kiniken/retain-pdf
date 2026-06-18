import {
  clearActiveJobId,
  writeActiveJobId,
} from "./active-job-storage.js";
import {
  createJobEventsResource,
} from "./job-events-resource.js";
import { createCurrentJobStatePort } from "./current-job-state.js";
import { createSecondaryResourceStatePort } from "./secondary-resource-cache.js";
import {
  createJobRenderContextPort,
} from "./render-context.js";
import {
  createRuntimePollingStatePort,
  JOB_POLL_INTERVAL_MS,
} from "./runtime-polling-state.js";
import {
  notifyLibraryJobUpdated,
  requestLibraryRefresh,
} from "./library-events.js";
import { createSecondaryResourceSchedulerPort } from "./secondary-resources.js";
import { returnJobRuntimeToHome } from "./runtime-reset.js";
import { createJobRuntimeShellViewPort } from "./shell-view-port.js";
import { createJobRuntimeResetStatePort } from "./reset-state-port.js";

export function mountJobRuntimeFeature({
  state,
  apiPrefix,
  buildJobDetailEndpoint,
  fetchJobPayload,
  fetchJobEvents,
  fetchJobArtifactsManifest,
  fetchJobStageActions,
  retryJobStage,
  submitJson,
  renderJob,
  renderJobSecondaryPatch,
  setText,
  setWorkflowSections,
  resetUploadProgress,
  resetUploadedFile,
  applyWorkflowMode,
  clearPageRanges,
  updateJobWarning,
  activateDetailTab,
  onReaderDialogSync,
  onReaderDialogClose,
  uploadStatePort,
  libraryEventPort,
  jobEventsResource = createJobEventsResource({ fetchJobEvents, apiPrefix }),
  pollingPort = createRuntimePollingStatePort(state),
  currentJobPort = createCurrentJobStatePort(state),
  secondaryResourcePort = createSecondaryResourceStatePort(state),
  shellViewPort = createJobRuntimeShellViewPort(),
  jobPresentationPort,
  resetStatePort = createJobRuntimeResetStatePort(state),
  renderContextPort = createJobRenderContextPort(state, { jobPresentationPort }),
  secondaryResourceSchedulerPort = createSecondaryResourceSchedulerPort({
    state,
    apiPrefix,
    fetchJobEvents,
    jobEventsResource,
    fetchJobArtifactsManifest,
    fetchJobStageActions,
    renderJobSecondaryPatch,
    notifyLibraryJobUpdated: (job) => notifyLibraryJobUpdated(job, { port: libraryEventPort }),
    pollingPort,
    currentJobPort,
    secondaryResourcePort,
    renderContextPort,
    jobPresentationPort,
  }),
}) {
  const normalizeJobPayload = jobPresentationPort?.normalizeJobPayload || ((value) => value || {});
  const isTerminalStatus = jobPresentationPort?.isTerminalStatus || ((status) => status === "failed" || status === "canceled");
  const isJobTerminal = jobPresentationPort?.isJobTerminal || ((value = {}) => isTerminalStatus(value?.status || value));

  async function fetchJob(jobId) {
    const generation = pollingPort.beginPoll();
    if (generation === null) {
      return;
    }
    let payload;
    try {
      payload = await fetchJobPayload(jobId, apiPrefix);
    } finally {
      pollingPort.finishPoll();
    }
    if (!pollingPort.isCurrentGeneration(jobId, generation)) {
      return;
    }
    const cachedEvents = secondaryResourcePort.cachedFor("events", jobId);
    const cachedManifest = secondaryResourcePort.cachedFor("manifest", jobId);
    const cachedStageActions = secondaryResourcePort.cachedFor("stageActions", jobId);
    const renderContext = renderContextPort.applySnapshot({
      payload,
      eventsPayload: cachedEvents,
      manifestPayload: cachedManifest,
      stageActionsPayload: cachedStageActions,
    });
    renderJob(renderContext);
    notifyLibraryJobUpdated(normalizeJobPayload(payload), { port: libraryEventPort });
    if (shellViewPort.isReaderOpen()) {
      onReaderDialogSync?.();
    }
    const job = normalizeJobPayload(payload);
    const terminal = isJobTerminal(job);
    requestLibraryRefresh(state, { terminal, port: libraryEventPort });
    if (terminal) {
      clearActiveJobId(jobId);
      pollingPort.stop();
    }
    secondaryResourceSchedulerPort.schedule({
      jobId,
      payload,
      generation,
      terminal,
    });
  }

  function startPolling(jobId) {
    pollingPort.stop();
    writeActiveJobId(jobId);
    resetStatePort.resetSecondary();
    const { startedAt } = pollingPort.startJob(jobId);
    const placeholderJob = {
      job_id: jobId,
      status: "queued",
      stage: "queued",
      display_stage: "ocr",
      lane: "main",
      current_stage: "queued",
      stage_detail: "正在读取任务状态...",
      created_at: startedAt,
      started_at: startedAt,
    };
    setWorkflowSections(placeholderJob);
    renderJob(renderContextPort.applySnapshot({
      payload: placeholderJob,
    }));
    libraryEventPort?.publishJobCreated?.(normalizeJobPayload(placeholderJob));
    notifyLibraryJobUpdated(normalizeJobPayload(placeholderJob), { port: libraryEventPort });
    requestLibraryRefresh(state, { port: libraryEventPort });
    fetchJob(jobId).catch((err) => {
      setText("error-box", err.message);
    });
    pollingPort.startTimer(() => {
      fetchJob(jobId).catch((err) => {
        setText("error-box", err.message);
      });
    }, JOB_POLL_INTERVAL_MS);
  }

  function returnToHome() {
    returnJobRuntimeToHome({
      state,
      onReaderDialogClose,
      setWorkflowSections,
      resetUploadProgress,
      resetUploadedFile,
      applyWorkflowMode,
      clearPageRanges,
      setText,
      updateJobWarning,
      activateDetailTab,
      uploadStatePort,
      shellViewPort,
      jobPresentationPort,
    });
  }

  async function cancelCurrentJob() {
    const jobId = currentJobPort.jobId();
    if (!jobId) {
      setText("error-box", "当前没有可取消的任务");
      return;
    }
    shellViewPort.setCancelDisabled(true);
    try {
      await submitJson(`${buildJobDetailEndpoint(jobId, apiPrefix)}/cancel`, {});
      await fetchJob(jobId);
    } catch (err) {
      setText("error-box", err.message);
    }
  }

  async function retryStage(stage) {
    const jobId = currentJobPort.jobId();
    const normalizedStage = `${stage || ""}`.trim();
    if (!jobId || !normalizedStage) {
      setText("error-box", "当前没有可重新执行的阶段");
      return;
    }
    try {
      setText("error-box", "-");
      const result = await retryJobStage(jobId, apiPrefix, normalizedStage);
      const nextJobId = `${result?.job_id || jobId}`.trim();
      if (nextJobId) {
        startPolling(nextJobId);
      } else {
        await fetchJob(jobId);
      }
    } catch (err) {
      setText("error-box", err.message || String(err));
    }
  }

  return {
    cancelCurrentJob,
    currentJobId: () => currentJobPort.jobId(),
    fetchJob,
    retryStage,
    returnToHome,
    startPolling,
    stopPolling: () => pollingPort.stop(),
  };
}
