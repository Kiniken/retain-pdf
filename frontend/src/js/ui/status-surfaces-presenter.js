import { updateActionButtons } from "./job-actions.js";
import { renderJobStatusCard } from "./job-status-card-renderer.js";
import { renderJobStatusSummary } from "./job-status-summary-presenter.js";
import {
  buildRuntimeStatusCardPatchPayload,
  buildRuntimeStatusCardViewModel,
  finishedAtFallbackForStatusCardRuntime,
} from "../job-status/status-card-runtime-source.js";
import { renderStatusDetails } from "./default-status-detail-adapters.js";

export function buildStatusViewModelForRuntime({
  runtime,
  job,
  jobId,
  events,
  manifest,
  stageActions,
  publicErrorText,
  stagePresentation = null,
}) {
  return buildRuntimeStatusCardViewModel({
    runtime,
    job,
    jobId,
    events,
    manifest,
    stageActions,
    publicErrorText,
    stagePresentation,
  });
}

export function statusDetailDurationOptionsForRuntime(runtime) {
  return {
    durationOptions: {
      finishedAtFallback: finishedAtFallbackForStatusCardRuntime(runtime),
    },
  };
}

export function renderStatusDetailsForRuntime({
  runtime,
  job,
  events,
}) {
  return renderStatusDetails(job, events, statusDetailDurationOptionsForRuntime(runtime));
}

export function renderJobMainStatusSurfaces({
  runtime,
  job,
  jobId,
  events,
  manifest,
  stageActions,
  refreshStatusCard,
  setStatus,
  setWorkflowSections,
  updateJobWarning,
}) {
  const statusViewModel = buildStatusViewModelForRuntime({
    runtime,
    job,
    jobId,
    events,
    manifest,
    stageActions,
    publicErrorText: "",
  });
  const { stagePresentation } = statusViewModel;
  setWorkflowSections?.(job);
  setStatus?.(job.status || "idle");
  const { publicErrorText } = renderJobStatusSummary(job, stagePresentation);
  updateActionButtons(job, manifest);
  if (!refreshStatusCard?.({ publicErrorText, stagePresentation })) {
    renderJobStatusCard({
      events,
      statusViewModel: buildStatusViewModelForRuntime({
        runtime,
        job,
        jobId,
        events,
        manifest,
        stageActions,
        publicErrorText,
        stagePresentation,
      }),
    });
  }
  renderStatusDetailsForRuntime({
    runtime,
    job,
    events,
  });
  runtime.startElapsed?.();
  updateJobWarning?.(job.status || "idle");
}

export function renderJobStatusSurfaces({
  runtime,
  job,
  jobId,
  events,
  manifest,
  stageActions,
  publicErrorText,
}) {
  const statusViewModel = buildStatusViewModelForRuntime({
    runtime,
    job,
    jobId,
    events,
    manifest,
    stageActions,
    publicErrorText,
  });
  renderJobStatusCard({
    statusViewModel,
    events,
  });
  return statusViewModel.stagePresentation;
}

export function renderJobStatusProgressPatch({
  runtime,
  job,
  jobId,
  events,
  manifest,
  stageActions,
  publicErrorText,
}) {
  const statusViewModel = buildStatusViewModelForRuntime({
    runtime,
    job,
    jobId,
    events,
    manifest,
    stageActions,
    publicErrorText,
  });
  renderJobStatusCard({
    statusViewModel,
    events,
  });
  renderStatusDetailsForRuntime({
    runtime,
    job,
    events,
  });
}

export function renderJobArtifactActionsPatch({
  runtime,
  job,
  jobId,
  events,
  manifest,
  stageActions,
  publicErrorText,
}) {
  updateActionButtons(job, manifest);
  renderJobStatusCard({
    events,
    statusViewModel: buildStatusViewModelForRuntime({
      runtime,
      job,
      jobId,
      events,
      manifest,
      stageActions,
      publicErrorText,
    }),
  });
}

export function renderJobStageActionsPatch({
  runtime,
  job,
  jobId,
  events,
  manifest,
  stageActions,
  publicErrorText,
}) {
  renderJobStatusCard({
    events,
    statusViewModel: buildStatusViewModelForRuntime({
      runtime,
      job,
      jobId,
      events,
      manifest,
      stageActions,
      publicErrorText,
    }),
  });
}

export function buildSecondaryStatusPatchPayload({
  runtime,
  job,
  jobId,
  events,
  manifest,
  stageActions,
}) {
  return buildRuntimeStatusCardPatchPayload({
    runtime,
    job,
    jobId,
    events,
    manifest,
    stageActions,
  });
}

export function renderJobSecondaryStatusPatch({
  runtime,
  renderContext,
  source = "",
  refreshStatusCard,
  updateActions = updateActionButtons,
  renderProgressPatch = renderJobStatusProgressPatch,
  renderArtifactActionsPatch = renderJobArtifactActionsPatch,
  renderStageActionsPatch = renderJobStageActionsPatch,
  renderSurfaces = renderJobStatusSurfaces,
  renderDetails = renderStatusDetailsForRuntime,
}) {
  const { job, events, manifest, stageActions } = renderContext || {};
  const resolvedJobId = renderContext?.jobId;
  if (!job) {
    return;
  }
  const patchPayload = buildSecondaryStatusPatchPayload({
    runtime,
    job,
    jobId: resolvedJobId,
    events,
    manifest,
    stageActions,
  });
  if (source === "events") {
    if (!refreshStatusCard?.({
      publicErrorText: patchPayload.publicErrorText,
      stagePresentation: patchPayload.stagePresentation,
    })) {
      renderProgressPatch({
        runtime,
        ...patchPayload,
      });
      return;
    }
    renderDetails({
      runtime,
      job,
      events,
    });
    return;
  }
  if (source === "manifest") {
    updateActions(job, manifest);
    if (!refreshStatusCard?.({
      publicErrorText: patchPayload.publicErrorText,
      stagePresentation: patchPayload.stagePresentation,
    })) {
      renderArtifactActionsPatch({
        runtime,
        ...patchPayload,
      });
    }
    return;
  }
  if (source === "stageActions") {
    if (!refreshStatusCard?.({
      publicErrorText: patchPayload.publicErrorText,
      stagePresentation: patchPayload.stagePresentation,
    })) {
      renderStageActionsPatch({
        runtime,
        ...patchPayload,
      });
    }
    return;
  }
  renderSurfaces({
    runtime,
    ...patchPayload,
  });
}
