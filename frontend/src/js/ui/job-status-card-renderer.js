import { buildStatusCardSnapshot } from "../job-status/status-card-snapshot.js";
import { setLinearProgress } from "./job-actions.js";
import { renderStatusCardSnapshot } from "./status-card-view-port.js";
import { renderLegacyStatusRing } from "./status-ring-fallback-presenter.js";

export function renderJobStatusCard({
  statusViewModel = null,
  job,
  jobId,
  stagePresentation,
  events,
  manifest,
  stageActions,
  publicErrorText,
  state,
}) {
  const snapshot = statusViewModel || buildStatusCardSnapshot({
    state,
    job,
    jobId,
    stagePresentation,
    events,
    manifest,
    stageActions,
    publicErrorText,
  });
  if (renderStatusCardSnapshot(snapshot)) {
    return;
  }
  const fallbackJob = snapshot.job || job || {};
  const fallbackStage = snapshot.stagePresentation || stagePresentation || {};
  setLinearProgress(
    "job-progress-bar",
    "job-progress-text",
    fallbackStage.progressCurrent,
    fallbackStage.progressTotal,
    "-",
    fallbackJob.progress_percent,
  );
  renderLegacyStatusRing(fallbackJob, events);
}
