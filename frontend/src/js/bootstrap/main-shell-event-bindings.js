import {
  APP_EVENTS,
  APP_SHELL_IDS,
} from "../contracts/app-contract.js";

export function bindMainShellEvents({
  workflowFeature,
  uploadFeature,
  appActionsFeature,
  jobRuntimeFeature,
  statusDetailFeature,
  state,
  fetchProtected,
  setText,
  eventPort,
} = {}) {
  eventPort.bindElementEvent(APP_SHELL_IDS.fileInput, "change", () => {
    void uploadFeature?.handleFileSelected();
  });
  eventPort.bindElementEvent(APP_SHELL_IDS.credentialGateAction, "click", (event) => {
    event.preventDefault();
    eventPort.dispatchDocumentEvent(APP_EVENTS.openBrowserCredentials);
  });
  eventPort.bindHiddenCredentialPersistence();
  eventPort.bindElementEvent(APP_SHELL_IDS.jobForm, "submit", (event) => {
    void appActionsFeature?.submitForm(event);
  });
  eventPort.bindElementEvent(APP_SHELL_IDS.pageRangeButton, "click", () => uploadFeature?.openPageRangeDialog());
  eventPort.bindElementEvent(APP_SHELL_IDS.pageRangeApplyButton, "click", () => uploadFeature?.applyPageRanges());
  eventPort.bindElementEvent(APP_SHELL_IDS.pageRangeClearButton, "click", () => uploadFeature?.clearPageRanges());
  eventPort.bindElementEvent(APP_SHELL_IDS.pageRangeStart, "input", () => {
    if (uploadFeature?.constrainPageRanges) {
      uploadFeature.constrainPageRanges({ source: "start" });
      return;
    }
    workflowFeature?.refreshSubmitControls();
  });
  eventPort.bindElementEvent(APP_SHELL_IDS.pageRangeEnd, "input", () => {
    if (uploadFeature?.constrainPageRanges) {
      uploadFeature.constrainPageRanges({ source: "end" });
      return;
    }
    workflowFeature?.refreshSubmitControls();
  });
  eventPort.bindElementEvent(APP_SHELL_IDS.cancelButton, "click", () => jobRuntimeFeature?.cancelCurrentJob());
  eventPort.bindPrimaryActions({
    state,
    fetchProtected,
    setTextFn: setText,
    statusDetailFeature,
  });
  eventPort.bindDocumentEvent(APP_EVENTS.returnHome, () => jobRuntimeFeature?.returnToHome());
  eventPort.bindDocumentEvent(APP_EVENTS.retryStage, (event) => {
    void jobRuntimeFeature?.retryStage(event.detail?.stage);
  });
  eventPort.bindElementEvent(APP_SHELL_IDS.openOutputButton, "click", () => {
    void appActionsFeature?.handleOpenOutputDir();
  });
}
