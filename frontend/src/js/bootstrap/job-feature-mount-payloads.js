export function buildStatusDetailMountPayload({
  features,
  ports,
} = {}) {
  return {
    state: ports.state,
    apiPrefix: ports.apiPrefix,
    fetchJobPayload: ports.fetchJobPayload,
    fetchJobEvents: ports.fetchJobEvents,
    fetchJobDiagnostics: ports.fetchJobDiagnostics,
    fetchResumePlan: ports.fetchResumePlan,
    fetchTranslationDiagnostics: ports.fetchTranslationDiagnostics,
    fetchTranslationItems: ports.fetchTranslationItems,
    fetchTranslationItem: ports.fetchTranslationItem,
    replayTranslationItem: ports.replayTranslationItem,
    rerunJob: ports.rerunJob,
    renderJob: ports.renderJob,
    startPolling: (jobId) => features.jobRuntimeFeature?.startPolling(jobId),
    setText: ports.setText,
  };
}

export function buildJobRuntimeMountPayload({
  features,
  ports,
} = {}) {
  return {
    state: ports.state,
    apiPrefix: ports.apiPrefix,
    buildJobDetailEndpoint: ports.buildJobDetailEndpoint,
    fetchJobPayload: ports.fetchJobPayload,
    fetchJobEvents: ports.fetchJobEvents,
    fetchJobArtifactsManifest: ports.fetchJobArtifactsManifest,
    fetchJobStageActions: ports.fetchJobStageActions,
    retryJobStage: ports.retryJobStage,
    submitJson: ports.submitJson,
    renderJob: ports.renderJob,
    renderJobSecondaryPatch: ports.renderJobSecondaryPatch,
    setText: ports.setText,
    setWorkflowSections: ports.setWorkflowSections,
    resetUploadProgress: ports.resetUploadProgress,
    resetUploadedFile: ports.resetUploadedFile,
    applyWorkflowMode: () => features.workflowFeature?.applyWorkflowMode(),
    clearPageRanges: () => features.uploadFeature?.clearPageRanges(),
    updateJobWarning: ports.updateJobWarning,
    activateDetailTab: (name) => features.statusDetailFeature?.activateDetailTab(name),
    onReaderDialogSync: () => features.readerDialogFeature?.syncToolbarActions(),
    onReaderDialogClose: () => features.readerDialogFeature?.close(),
    uploadStatePort: features.uploadStatePort,
    resetStatePort: ports.resetStatePort,
    libraryEventPort: features.libraryEventPort,
    shellViewPort: ports.shellViewPort,
    jobPresentationPort: ports.jobPresentationPort,
  };
}
