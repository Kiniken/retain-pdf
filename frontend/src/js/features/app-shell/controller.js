import { initializeIdleAppView } from "./idle-reset.js";
import { APP_DIALOG_BACKDROP_IDS } from "../../contracts/app-contract.js";
import { defaultAppShellConfigPort } from "./config-port.js";
import { createAppShellChromeViewPort } from "./chrome-view-port.js";

export function mountAppShellFeature({
  configPort = defaultAppShellConfigPort,
  chromeViewPort = createAppShellChromeViewPort(),
  jobPresentationPort,
  prepareFilePicker,
  setText,
  setWorkflowSections,
  setLinearProgress,
  updateActionButtons,
  renderPageRangeSummary,
  resetUploadProgress,
  resetUploadedFile,
  applyWorkflowMode,
  updateJobWarning,
  activateDetailTab,
  translationWorkflowDialogFeature,
}) {
  function bindChrome() {
    APP_DIALOG_BACKDROP_IDS.forEach(chromeViewPort.bindBackdropClose);
    chromeViewPort.bindInfoBubbleToggles();
    chromeViewPort.bindUploadTile(prepareFilePicker);
    translationWorkflowDialogFeature?.bindEvents();
  }

  function initializeIdleView() {
    initializeIdleAppView({
      configPort,
      jobPresentationPort,
      setText,
      setWorkflowSections,
      setLinearProgress,
      updateActionButtons,
      renderPageRangeSummary,
      resetUploadProgress,
      resetUploadedFile,
      applyWorkflowMode,
      updateJobWarning,
      resetEventsList: chromeViewPort.resetEvents,
      activateDetailTab,
    });
  }

  return {
    bindChrome,
    initializeIdleView,
  };
}
