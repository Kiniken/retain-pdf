import {
  closeTranslationWorkflowDialogView,
  isTranslationWorkflowDialogOpen,
  openTranslationWorkflowDialogView,
  syncTranslationWorkflowDialogMode,
  translationWorkflowCloseButtonElement,
  translationWorkflowDialogElement,
} from "./view.js";

export function createTranslationWorkflowDialogViewPort({
  closeDialog = closeTranslationWorkflowDialogView,
  closeButtonElement = translationWorkflowCloseButtonElement,
  dialogElement = translationWorkflowDialogElement,
  isOpen = isTranslationWorkflowDialogOpen,
  openDialog = openTranslationWorkflowDialogView,
  syncMode = syncTranslationWorkflowDialogMode,
  statusAreaPort,
} = {}) {
  function withStatusAreaPort(options = {}) {
    return {
      ...options,
      statusAreaPort: options.statusAreaPort || statusAreaPort,
    };
  }

  return {
    closeButtonElement,
    closeDialog,
    dialogElement,
    isOpen,
    openDialog: (options) => openDialog(withStatusAreaPort(options)),
    syncMode: (options) => syncMode(withStatusAreaPort(options)),
  };
}
