export function buildHomeFeatureMountPayload({
  homeStatePort,
} = {}) {
  return {
    statePort: homeStatePort,
  };
}

export function buildTranslationWorkflowDialogMountPayload({
  features,
  homeStatePort,
  ports,
} = {}) {
  return {
    homeStatePort,
    statusAreaPort: ports?.translationWorkflowStatusAreaPort,
    uploadSessionPort: {
      resetUploadSession: () => features?.uploadFeature?.resetUploadSession?.(),
    },
  };
}

export function buildAppShellFeatureMountPayload({
  features,
  ports,
} = {}) {
  return {
    prepareFilePicker: ports.prepareFilePicker,
    jobPresentationPort: ports.jobPresentationPort,
    setText: ports.setText,
    setWorkflowSections: ports.setWorkflowSections,
    setLinearProgress: ports.setLinearProgress,
    updateActionButtons: ports.updateActionButtons,
    renderPageRangeSummary: () => features.uploadFeature?.renderPageRangeSummary(),
    resetUploadProgress: ports.resetUploadProgress,
    resetUploadedFile: ports.resetUploadedFile,
    applyWorkflowMode: () => features.workflowFeature?.applyWorkflowMode(),
    updateJobWarning: ports.updateJobWarning,
    activateDetailTab: (name) => features.statusDetailFeature?.activateDetailTab(name),
    translationWorkflowDialogFeature: features.translationWorkflowDialogFeature,
  };
}
