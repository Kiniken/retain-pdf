import {
  applyMockUploadView as defaultApplyMockUploadView,
  applyWorkflowUploadView as defaultApplyWorkflowUploadView,
  closeDeveloperDialog as defaultCloseDeveloperDialog,
  readDeveloperDialogValues as defaultReadDeveloperDialogValues,
  readDeveloperWorkflowValue as defaultReadDeveloperWorkflowValue,
  readWorkflowSubmitValues as defaultReadWorkflowSubmitValues,
  renderTranslationBudgetNote as defaultRenderTranslationBudgetNote,
  setDeveloperDialogValues as defaultSetDeveloperDialogValues,
  setDeveloperGlossaryOptions as defaultSetDeveloperGlossaryOptions,
  setDeveloperWorkflowFormState as defaultSetDeveloperWorkflowFormState,
  setSubmitControls as defaultSetSubmitControls,
} from "./view.js";

export function createWorkflowViewPort({
  applyMockUpload = defaultApplyMockUploadView,
  applyWorkflowUpload = defaultApplyWorkflowUploadView,
  closeDeveloperDialog = defaultCloseDeveloperDialog,
  readDeveloperDialog = defaultReadDeveloperDialogValues,
  readDeveloperWorkflow = defaultReadDeveloperWorkflowValue,
  readSubmitValues = defaultReadWorkflowSubmitValues,
  renderBudgetNote = defaultRenderTranslationBudgetNote,
  setDeveloperDialog = defaultSetDeveloperDialogValues,
  setDeveloperGlossaryOptions = defaultSetDeveloperGlossaryOptions,
  setDeveloperWorkflowFormState = defaultSetDeveloperWorkflowFormState,
  setSubmitControls = defaultSetSubmitControls,
  credentialsStatePort = null,
  uploadTilePort = null,
} = {}) {
  function withUploadTilePort(payload = {}) {
    return {
      ...payload,
      uploadTilePort: payload.uploadTilePort || uploadTilePort,
    };
  }

  return {
    applyMockUpload: (payload) => applyMockUpload(withUploadTilePort(payload)),
    applyWorkflowUpload: (payload) => applyWorkflowUpload(withUploadTilePort(payload)),
    closeDeveloperDialog,
    readDeveloperDialog,
    readDeveloperWorkflow,
    readSubmitValues: (options) => readSubmitValues({
      ...options,
      credentialsStatePort,
    }),
    renderBudgetNote,
    setDeveloperDialog,
    setDeveloperGlossaryOptions,
    setDeveloperWorkflowFormState,
    setSubmitControls: (payload) => setSubmitControls(withUploadTilePort(payload)),
  };
}
