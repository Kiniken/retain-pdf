import {
  APP_EVENTS,
  APP_SHELL_IDS,
} from "../../contracts/app-contract.js";
import { createTranslationWorkflowDialogStatePort } from "./state.js";
import { createTranslationWorkflowDialogViewPort } from "./dialog-view-port.js";
import { createTranslationWorkflowStatusAreaPort } from "./status-area-port.js";
import { TRANSLATION_WORKFLOW_MODES } from "./contract.js";

export function mountTranslationWorkflowDialogFeature({
  homeStatePort,
  dialogStatePort,
  statusAreaPort = createTranslationWorkflowStatusAreaPort(),
  uploadSessionPort = null,
  viewPort = createTranslationWorkflowDialogViewPort({ statusAreaPort }),
} = {}) {
  const workflowDialogStatePort = dialogStatePort || createTranslationWorkflowDialogStatePort({ homeStatePort });
  const viewOptions = { dialogStatePort: workflowDialogStatePort, statusAreaPort };

  function requestClose() {
    if (statusAreaPort.isVisible()) {
      statusAreaPort.returnHome();
      return;
    }
    viewPort.closeDialog(viewOptions);
  }

  const open = (options = {}) => viewPort.openDialog({ ...viewOptions, ...options });
  function openUpload() {
    statusAreaPort.hide?.();
    uploadSessionPort?.resetUploadSession?.();
    open({ mode: TRANSLATION_WORKFLOW_MODES.UPLOAD });
  }
  function openFromEvent(event = {}) {
    const mode = event?.detail?.mode;
    if (!mode || mode === TRANSLATION_WORKFLOW_MODES.UPLOAD) {
      openUpload();
      return;
    }
    open({ mode });
  }
  const close = () => viewPort.closeDialog(viewOptions);
  const sync = () => viewPort.syncMode(viewOptions);

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const trigger = event.target?.closest?.(`#${APP_SHELL_IDS.libraryAddPdfButton}`);
      if (!trigger) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      openUpload();
    });
    document.addEventListener(APP_EVENTS.openTranslationWorkflow, openFromEvent);
    document.addEventListener(APP_EVENTS.closeTranslationWorkflow, close);
    document.addEventListener(APP_EVENTS.translationWorkflowSync, sync);
    document.addEventListener(APP_EVENTS.statusAreaVisibilityChanged, sync);
    viewPort.dialogElement()?.addEventListener("click", (event) => {
      if (event.target === viewPort.dialogElement()) {
        requestClose();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && viewPort.isOpen()) {
        requestClose();
      }
    });
    viewPort.closeButtonElement()?.addEventListener("click", requestClose);
  }

  return {
    bindEvents,
    close,
    statePort: workflowDialogStatePort,
    open,
  };
}
