export function buildWorkflowFeatureMountPayload({
  credentialsPorts,
  credentialsStatePort,
  ports,
  uploadPorts,
  uploadStatePort,
} = {}) {
  return {
    configPort: ports.workflowConfigPort,
    saveDeveloperStoredConfig: ports.saveDeveloperStoredConfig,
    getDeepSeekBalanceState: () => credentialsStatePort.getDeepSeekBalanceState(),
    getDeveloperConfig: () => ports.getDeveloperConfig(ports.state),
    getUploadState: uploadStatePort.getSnapshot,
    isDesktopMode: () => ports.isDesktopMode(ports.state),
    resetDeveloperConfig: () => ports.resetDeveloperConfig(ports.state),
    setDeveloperConfig: (config) => ports.setDeveloperConfig(ports.state, config),
    defaultModelName: ports.defaultModelName,
    defaultModelBaseUrl: ports.defaultModelBaseUrl,
    defaultMineruToken: ports.defaultMineruToken,
    defaultPaddleApiUrl: ports.defaultPaddleApiUrl,
    defaultPaddleToken: ports.defaultPaddleToken,
    defaultOcrProvider: ports.defaultOcrProvider,
    defaultModelApiKey: ports.defaultModelApiKey,
    normalizeWorkflow: ports.normalizeWorkflow,
    normalizeMathMode: ports.normalizeMathMode,
    constants: ports.constants,
    currentPageRanges: uploadPorts.currentPageRanges,
    readSubmitValues: (options) => ports.readWorkflowSubmitValues({
      ...options,
      credentialsStatePort,
    }),
    viewPort: ports.workflowViewPort,
    renderPageRangeSummary: uploadPorts.renderPageRangeSummary,
    hasBrowserCredentials: credentialsPorts.hasBrowserCredentials,
    updateCredentialGate: credentialsPorts.updateCredentialGate,
    fetchGlossaries: ports.fetchGlossaries,
    apiPrefix: ports.apiPrefix,
    setText: ports.setText,
  };
}

export function buildDeveloperFeatureMountPayload({
  workflowPorts,
} = {}) {
  return {
    syncDeveloperDialogFromState: workflowPorts.syncDeveloperDialogFromState,
    updateDeveloperWorkflowFormState: workflowPorts.updateDeveloperWorkflowFormState,
    saveDeveloperDialog: workflowPorts.saveDeveloperDialog,
    resetDeveloperDialog: workflowPorts.resetDeveloperDialog,
  };
}

export function buildUploadFeatureMountPayload({
  credentialsPorts,
  ports,
  uploadStatePort,
  workflowPorts,
} = {}) {
  return {
    state: ports.state,
    uploadStatePort,
    apiBase: ports.apiBase,
    apiPrefix: ports.apiPrefix,
    frontMaxBytes: ports.frontMaxBytes,
    frontMaxPageCount: ports.frontMaxPageCount,
    countPdfPages: ports.countPdfPages,
    defaultFileLabel: ports.defaultFileLabel,
    collectUploadFormData: ports.collectUploadFormData,
    submitUploadRequest: ports.submitUploadRequest,
    resetUploadedFile: ports.resetUploadedFile,
    resetUploadProgress: ports.resetUploadProgress,
    setUploadProgress: ports.setUploadProgress,
    clearFileInputValue: ports.clearFileInputValue,
    setText: ports.setText,
    applyWorkflowMode: workflowPorts.applyWorkflowMode,
    refreshSubmitControls: workflowPorts.refreshSubmitControls,
    refreshDeepSeekBalance: credentialsPorts.refreshDeepSeekBalance,
    workflowNeedsUpload: workflowPorts.workflowNeedsUpload,
  };
}
