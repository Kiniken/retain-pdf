import {
  prepareFilePicker,
  resetUploadedFile as resetUploadedFilePresentation,
  setLinearProgress,
  updateActionButtons,
} from "./job-actions.js";
import {
  setStatusView,
} from "./presentation-view.js";
import {
  setWorkflowSections as setWorkflowSectionsVisibility,
  updateJobWarning,
} from "./workflow-visibility-presenter.js";
import { defaultPresentationRuntime } from "./default-presentation-runtime.js";
import { createConnectedJobStatusCard } from "../components/status/connected-job-status-card.js";
import {
  renderJobMainStatusSurfaces,
  renderJobSecondaryStatusPatch,
} from "./status-surfaces-presenter.js";

const presentationRuntime = defaultPresentationRuntime;
const runtimeStatusCardSource = presentationRuntime.createStatusCardSource();
const runtimeStatusCard = createConnectedJobStatusCard({
  snapshotSource: runtimeStatusCardSource,
});

function refreshRuntimeStatusCard({
  publicErrorText = "",
  stagePresentation = null,
} = {}) {
  runtimeStatusCardSource.setPresentationOverride?.({
    publicErrorText,
    stagePresentation,
  });
  return runtimeStatusCard.refresh();
}

export function setStatus(status) {
  setStatusView(status);
  presentationRuntime.startElapsed();
}

export function setWorkflowSections(job = null) {
  setWorkflowSectionsVisibility(job, {
    onClear: () => presentationRuntime.stopElapsed(),
  });
}

export {
  clearFileInputValue,
  prepareFilePicker,
  resetUploadProgress,
  setLinearProgress,
  setUploadProgress,
  updateActionButtons,
} from "./job-actions.js";

export function resetUploadedFile() {
  presentationRuntime.stopElapsed();
  resetUploadedFilePresentation();
}

export { updateJobWarning };

function renderJobMainSurfaces({
  job,
  jobId,
  events,
  manifest,
  stageActions,
}) {
  renderJobMainStatusSurfaces({
    runtime: presentationRuntime,
    job,
    jobId,
    events,
    manifest,
    stageActions,
    refreshStatusCard: refreshRuntimeStatusCard,
    setStatus,
    setWorkflowSections,
    updateJobWarning,
  });
}

function isJobRenderContext(value) {
  return Boolean(value?.job && Object.prototype.hasOwnProperty.call(value, "jobId"));
}

export function renderJob(payload, eventsPayload = null, manifestPayload = null, stageActionsPayload = null) {
  const { job, jobId, events, manifest, stageActions } = isJobRenderContext(payload)
    ? payload
    : presentationRuntime.applySnapshot({
      payload,
      eventsPayload,
      manifestPayload,
      stageActionsPayload,
    });
  renderJobMainSurfaces({
    job,
    jobId,
    events,
    manifest,
    stageActions,
  });
}

export function renderJobSecondaryPatch({
  context = null,
  jobId,
  eventsPayload = null,
  manifestPayload = null,
  stageActionsPayload = null,
  source = "",
} = {}) {
  let renderContext = null;
  if (isJobRenderContext(context)) {
    renderContext = context;
  } else if (isJobRenderContext(jobId)) {
    renderContext = jobId;
  } else {
    renderContext = presentationRuntime.applySecondary({
      jobId,
      eventsPayload,
      manifestPayload,
      stageActionsPayload,
    });
  }
  const { job, events, manifest, stageActions } = renderContext;
  if (!job) {
    return;
  }
  renderJobSecondaryStatusPatch({
    runtime: presentationRuntime,
    renderContext: {
      ...renderContext,
      job,
      events,
      manifest,
      stageActions,
    },
    source,
    refreshStatusCard: refreshRuntimeStatusCard,
  });
}
