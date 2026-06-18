import { createSubmitFlowPorts } from "./submit-flow-ports.js";
import { createAppActionsJobSnapshotPort } from "./app-actions-job-snapshot-port.js";

export function buildBrowserCredentialsMountPayload({
  appActionPorts,
  credentialsStatePort,
  ports,
  uploadStatePort,
  workflowPorts,
} = {}) {
  return {
    apiPrefix: ports.apiPrefix,
    state: ports.state,
    credentialsStatePort,
    applyHiddenCredentialInputs: ports.applyHiddenCredentialInputs,
    defaultMineruToken: ports.defaultMineruToken,
    defaultPaddleToken: ports.defaultPaddleToken,
    defaultModelApiKey: ports.defaultModelApiKey,
    defaultModelBaseUrl: ports.defaultModelBaseUrl,
    getTaskOptions: workflowPorts.developerConfigWithDefaults,
    saveTaskOptions: ports.saveTaskOptions,
    saveBrowserStoredConfig: ports.saveBrowserStoredConfig,
    readHiddenCredentialInputs: ports.readHiddenCredentialInputs,
    saveDesktopConfig: ports.saveDesktopConfig,
    checkApiConnectivity: appActionPorts.checkApiConnectivity,
    validateOcrToken: ports.validateOcrToken,
    validateDeepSeekToken: ports.validateDeepSeekToken,
    queryDeepSeekBalance: ports.queryDeepSeekBalance,
    onCredentialStateChange: workflowPorts.applyWorkflowMode,
    balanceStatePort: ports.browserCredentialsBalanceStatePort,
    legacyRuntimePort: ports.browserCredentialsLegacyRuntimePort,
    legacyValidationCachePort: ports.browserCredentialsLegacyValidationCachePort,
    runtimeEnvPort: ports.browserCredentialsRuntimeEnvPort,
    uploadStatePort: uploadStatePort || ports.browserCredentialsUploadStatePort,
    viewPort: ports.browserCredentialViewPort,
  };
}

export function buildArtifactDownloadsMountPayload({
  ports,
} = {}) {
  return {
    state: ports.state,
    fetchProtected: ports.fetchProtected,
    downloadNameResolver: ports.artifactDownloadNameResolver,
    runtimePort: ports.artifactDownloadsRuntimePort,
    setText: ports.setText,
  };
}

export function buildAppActionsMountPayload({
  credentialsPorts,
  jobRuntimePorts,
  libraryEventPort,
  ports,
  uploadPorts,
  uploadStatePort,
  workflowPorts,
} = {}) {
  return {
    state: ports.state,
    runtimeEnvPort: ports.appActionsRuntimeEnvPort,
    uploadStatePort: uploadStatePort || ports.appActionsUploadStatePort,
    configPort: ports.appActionsConfigPort,
    apiPrefix: ports.apiPrefix,
    buildApiEndpoint: ports.buildApiEndpoint,
    setText: ports.setText,
    openDesktopOutputDirectory: ports.openDesktopOutputDirectory,
    resetUploadedFile: ports.resetUploadedFile,
    submitFlow: createSubmitFlowPorts({
      workflowPorts,
      uploadPorts,
      credentialsPorts,
      jobRuntimePorts,
      libraryEventPort,
      jobSnapshotPort: createAppActionsJobSnapshotPort(ports.state),
      openSetupDialog: ports.openSetupDialog,
      renderJob: ports.renderJob,
      submitJobRequest: ports.submitJobRequest,
    }),
  };
}
