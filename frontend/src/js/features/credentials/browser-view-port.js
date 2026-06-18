import { $ } from "../../dom/query.js";
import {
  CREDENTIAL_DOM_IDS,
} from "./credentials-dom-contract.js";
import {
  activateCredentialTabView as defaultActivateCredentialTabView,
  bindCredentialViewEvents as defaultBindCredentialViewEvents,
  browserCredentialElements as defaultBrowserCredentialElements,
  closeCredentialDialog as defaultCloseCredentialDialog,
  openCredentialDialog as defaultOpenCredentialDialog,
  setCredentialDialogModeView as defaultSetCredentialDialogModeView,
  setDeepSeekTopUpVisible as defaultSetDeepSeekTopUpVisible,
  setDeepSeekValidationMessage as defaultSetDeepSeekValidationMessage,
  setDialogStatus as defaultSetDialogStatus,
  setOcrValidationMessage as defaultSetOcrValidationMessage,
  syncOcrProviderControlsView as defaultSyncOcrProviderControlsView,
  updateCredentialGateView as defaultUpdateCredentialGateView,
} from "./view.js";

const { hidden: HIDDEN_CREDENTIAL_IDS } = CREDENTIAL_DOM_IDS;

export function createBrowserCredentialViewPort({
  activateTab = defaultActivateCredentialTabView,
  bindEvents = defaultBindCredentialViewEvents,
  closeDialog = defaultCloseCredentialDialog,
  dialogElements = defaultBrowserCredentialElements,
  openDialog = defaultOpenCredentialDialog,
  setDeepSeekTopUpVisible = defaultSetDeepSeekTopUpVisible,
  setDeepSeekValidationMessage = defaultSetDeepSeekValidationMessage,
  setDialogMode = defaultSetCredentialDialogModeView,
  setDialogStatus = defaultSetDialogStatus,
  setHiddenOcrProvider = (provider) => {
    const providerInput = $(HIDDEN_CREDENTIAL_IDS.ocrProvider);
    if (providerInput) {
      providerInput.value = provider;
    }
  },
  setOcrValidationMessage = defaultSetOcrValidationMessage,
  syncOcrProviderControls = defaultSyncOcrProviderControlsView,
  updateCredentialGate = defaultUpdateCredentialGateView,
  uploadTilePort = null,
} = {}) {
  function updateCredentialGateWithUploadTilePort(payload = {}) {
    return updateCredentialGate({
      ...payload,
      uploadTilePort: payload.uploadTilePort || uploadTilePort,
    });
  }

  return {
    activateTab,
    bindEvents,
    closeDialog,
    dialogElements,
    openDialog,
    setDeepSeekTopUpVisible,
    setDeepSeekValidationMessage,
    setDialogMode,
    setDialogStatus,
    setHiddenOcrProvider,
    setOcrValidationMessage,
    syncOcrProviderControls,
    updateCredentialGate: updateCredentialGateWithUploadTilePort,
  };
}
