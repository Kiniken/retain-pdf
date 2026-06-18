import { $ } from "../../dom/query.js";
import {
  CREDENTIAL_DOM_DATASETS,
  CREDENTIAL_DOM_IDS,
  CREDENTIAL_DOM_SELECTORS,
} from "./credentials-dom-contract.js";
import { credentialDialog } from "./dialog-view.js";
import { APP_EVENTS } from "../../contracts/app-contract.js";
export {
  activateCredentialTabView,
  browserCredentialElements,
  closeCredentialDialog,
  credentialDialog,
  currentCredentialDialogSetupMode,
  openCredentialDialog,
  setCredentialDialogModeView,
  setDialogStatus,
} from "./dialog-view.js";
export {
  setDeepSeekTopUpVisible,
  setDeepSeekValidationMessage,
  setOcrValidationMessage,
} from "./validation-view.js";

const { browser: BROWSER_CREDENTIAL_IDS } = CREDENTIAL_DOM_IDS;
const noopUploadTilePort = Object.freeze({
  setUploadTileLocked: () => {},
  setUploadTileReady: () => {},
  setUploadTileText: () => {},
});

function uploadTilePortFromOptions(options = {}) {
  return options.uploadTilePort || noopUploadTilePort;
}

export function syncOcrProviderControlsView(providerId) {
  const activeProvider = `${providerId || ""}`.trim();
  const dialog = credentialDialog();
  if (!dialog) {
    return;
  }
  const apiSelect = $(BROWSER_CREDENTIAL_IDS.ocrProviderSelect);
  if (apiSelect) {
    apiSelect.value = activeProvider;
  }
  dialog.querySelectorAll(CREDENTIAL_DOM_SELECTORS.ocrProviderPanel).forEach((panel) => {
    const active = panel.dataset[CREDENTIAL_DOM_DATASETS.ocrProviderPanel] === activeProvider;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  });
}

export function updateCredentialGateView({
  desktopMode,
  show,
  uploadEnabled,
  uploadReady,
  uploadTilePort,
}) {
  const tilePort = uploadTilePortFromOptions({ uploadTilePort });
  const trigger = $(CREDENTIAL_DOM_IDS.trigger);
  const gate = $(CREDENTIAL_DOM_IDS.gate);
  if (!gate || !$(CREDENTIAL_DOM_IDS.file)) {
    return false;
  }
  if (desktopMode) {
    gate.classList.add("hidden");
    trigger?.classList.remove("is-nudged");
    tilePort.setUploadTileLocked({ locked: !uploadEnabled, enabled: uploadEnabled });
    tilePort.setUploadTileReady(uploadEnabled && uploadReady);
    return true;
  }
  gate.classList.toggle("hidden", !show);
  trigger?.classList.toggle("is-nudged", show);
  tilePort.setUploadTileLocked({ locked: show || !uploadEnabled, enabled: !show && uploadEnabled });
  tilePort.setUploadTileText({
    labelVisible: !show,
    helpVisible: true,
    statusVisible: show ? false : null,
  });
  tilePort.setUploadTileReady(!show && uploadEnabled && uploadReady);
  return true;
}

export function bindCredentialViewEvents({
  resetMineruValidation,
  resetPaddleValidation,
  resetDeepSeekValidation,
  validateOcr,
  validateDeepSeek,
  save,
  open,
  activateCredentialTab,
  changeProvider,
}) {
  $(BROWSER_CREDENTIAL_IDS.mineruToken)?.addEventListener("input", resetMineruValidation);
  $(BROWSER_CREDENTIAL_IDS.paddleToken)?.addEventListener("input", resetPaddleValidation);
  $(BROWSER_CREDENTIAL_IDS.apiKey)?.addEventListener("input", resetDeepSeekValidation);
  $(BROWSER_CREDENTIAL_IDS.modelBaseUrl)?.addEventListener("input", resetDeepSeekValidation);
  $(BROWSER_CREDENTIAL_IDS.modelName)?.addEventListener("input", resetDeepSeekValidation);
  $(BROWSER_CREDENTIAL_IDS.mineruValidateButton)?.addEventListener("click", validateOcr);
  $(BROWSER_CREDENTIAL_IDS.paddleValidateButton)?.addEventListener("click", validateOcr);
  $(BROWSER_CREDENTIAL_IDS.deepSeekValidateButton)?.addEventListener("click", validateDeepSeek);
  $(BROWSER_CREDENTIAL_IDS.saveButton)?.addEventListener("click", save);
  document.addEventListener("click", (event) => {
    const trigger = event.target?.closest?.(CREDENTIAL_DOM_SELECTORS.trigger);
    if (!trigger) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    open?.();
  });
  credentialDialog()?.querySelectorAll(CREDENTIAL_DOM_SELECTORS.toggleSecret).forEach((button) => {
    button.addEventListener("click", () => {
      const input = $(button.dataset[CREDENTIAL_DOM_DATASETS.toggleSecret] || "");
      if (!input) {
        return;
      }
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      button.classList.toggle("is-revealed", !showing);
      button.setAttribute("aria-pressed", !showing ? "true" : "false");
    });
  });
  document.addEventListener(APP_EVENTS.openBrowserCredentials, (event) => {
    open(event?.detail || {});
  });
  credentialDialog()?.querySelectorAll(CREDENTIAL_DOM_SELECTORS.credentialTab).forEach((tab) => {
    tab.addEventListener("click", () => {
      activateCredentialTab(tab.dataset[CREDENTIAL_DOM_DATASETS.credentialTab] || "api");
    });
  });
  $(BROWSER_CREDENTIAL_IDS.ocrProviderSelect)?.addEventListener("change", changeProvider);
}
