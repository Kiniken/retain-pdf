import { createDeveloperViewPort } from "./developer-view-port.js";

export function mountDeveloperFeature({
  viewPort = createDeveloperViewPort(),
  syncDeveloperDialogFromState,
  updateDeveloperWorkflowFormState,
  saveDeveloperDialog,
  resetDeveloperDialog,
}) {
  function activateDeveloperTab(tabName = "model") {
    viewPort.activateTab(tabName);
  }

  function showDeveloperSettingsDialog() {
    syncDeveloperDialogFromState?.();
    activateDeveloperTab("model");
    viewPort.openDialog();
  }

  function openDeveloperDialog() {
    showDeveloperSettingsDialog();
  }

  function bindEvents() {
    viewPort.bindEvents({
      openDeveloperDialog,
      saveDeveloperDialog,
      resetDeveloperDialog,
      updateDeveloperWorkflowFormState,
      activateDeveloperTab,
    });
  }

  return {
    activateDeveloperTab,
    bindEvents,
    openDeveloperDialog,
    showDeveloperSettingsDialog,
  };
}
