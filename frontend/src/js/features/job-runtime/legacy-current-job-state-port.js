export function syncLegacyCurrentJobState(state, snapshot = {}) {
  if (!state) {
    return;
  }
  state.currentJobId = snapshot.jobId;
  state.currentJobSnapshot = snapshot.snapshot;
  state.currentJobStartedAt = snapshot.startedAt;
  state.currentJobFinishedAt = snapshot.finishedAt;
  state.currentJobDiagnostics = snapshot.diagnostics;
  state.currentJobDiagnosticsJobId = snapshot.diagnosticsJobId;
  state.currentJobResumePlan = snapshot.resumePlan;
  state.currentJobResumePlanJobId = snapshot.resumePlanJobId;
}

export function createLegacyCurrentJobStatePort(state) {
  return {
    sync(snapshot = {}) {
      syncLegacyCurrentJobState(state, snapshot);
    },
  };
}
