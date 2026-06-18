import { WORKFLOW_BOOK, WORKFLOW_RENDER } from "./workflow-constants.js";

export function createWorkflowPorts(features) {
  return {
    applyWorkflowMode: () => features.workflowFeature?.applyWorkflowMode(),
    collectRunPayload: () => features.workflowFeature?.collectRunPayload() || {},
    currentBudgetState: () => features.workflowFeature?.currentBudgetState?.(),
    currentRenderSourceJobId: () => features.workflowFeature?.currentRenderSourceJobId() || "",
    currentWorkflow: () => features.workflowFeature?.currentWorkflow() || WORKFLOW_BOOK,
    developerConfigWithDefaults: () => features.workflowFeature?.developerConfigWithDefaults() || {},
    loadGlossaryOptions: (options) => features.workflowFeature?.loadGlossaryOptions(options),
    refreshSubmitControls: () => features.workflowFeature?.refreshSubmitControls(),
    resetDeveloperDialog: () => features.workflowFeature?.resetDeveloperDialog(),
    saveDeveloperDialog: () => features.workflowFeature?.saveDeveloperDialog(),
    syncDeveloperDialogFromState: () => features.workflowFeature?.syncDeveloperDialogFromState(),
    updateDeveloperWorkflowFormState: () => features.workflowFeature?.updateDeveloperWorkflowFormState(),
    workflowNeedsCredentials: (workflow) => (
      features.workflowFeature?.workflowNeedsCredentials(workflow) ?? (workflow !== WORKFLOW_RENDER)
    ),
    workflowNeedsUpload: (workflow) => (
      features.workflowFeature?.workflowNeedsUpload(workflow) ?? (workflow !== WORKFLOW_RENDER)
    ),
  };
}
