import { $ } from "../../dom/query.js";
import {
  CREDENTIAL_DOM_DATASETS,
  CREDENTIAL_DOM_IDS,
  CREDENTIAL_DOM_SELECTORS,
} from "./credentials-dom-contract.js";

const { browser: BROWSER_CREDENTIAL_IDS } = CREDENTIAL_DOM_IDS;

export function credentialDialog() {
  return $(CREDENTIAL_DOM_IDS.dialog);
}

export function currentCredentialDialogSetupMode() {
  return credentialDialog()?.dataset?.[CREDENTIAL_DOM_DATASETS.setupMode] === "1";
}

export function browserCredentialElements() {
  return {
    dialog: $(CREDENTIAL_DOM_IDS.dialog),
    mineruInput: $(BROWSER_CREDENTIAL_IDS.mineruToken),
    paddleInput: $(BROWSER_CREDENTIAL_IDS.paddleToken),
    apiKeyInput: $(BROWSER_CREDENTIAL_IDS.apiKey),
    modelBaseUrlInput: $(BROWSER_CREDENTIAL_IDS.modelBaseUrl),
    modelNameInput: $(BROWSER_CREDENTIAL_IDS.modelName),
    mathModeSelect: $(BROWSER_CREDENTIAL_IDS.mathMode),
    trigger: $(CREDENTIAL_DOM_IDS.trigger),
  };
}

export function setCredentialDialogModeView({ setupMode = false, activateCredentialTab }) {
  const dialog = credentialDialog();
  if (!dialog) {
    return;
  }
  dialog.dataset[CREDENTIAL_DOM_DATASETS.setupMode] = setupMode ? "1" : "0";
  $(BROWSER_CREDENTIAL_IDS.title).textContent = setupMode ? "首次配置" : "接口设置";
  const subtitle = $(BROWSER_CREDENTIAL_IDS.subtitle);
  if (subtitle) {
    subtitle.textContent = "";
    subtitle.classList.add("hidden");
  }
  $(BROWSER_CREDENTIAL_IDS.saveButton).textContent = setupMode ? "保存并启动" : "保存";
  $(BROWSER_CREDENTIAL_IDS.tabs)?.classList.toggle("hidden", setupMode);
  if (setupMode) {
    activateCredentialTab("api");
  }
}

export function setDialogStatus(message = "", tone = "") {
  const el = $(BROWSER_CREDENTIAL_IDS.status);
  if (!el) {
    return;
  }
  const content = `${message || ""}`.trim();
  el.textContent = content;
  el.classList.toggle("hidden", !content);
  el.classList.toggle("is-valid", tone === "valid");
  el.classList.toggle("is-error", tone === "error");
}

export function activateCredentialTabView(tabName = "api") {
  const dialog = credentialDialog();
  if (!dialog) {
    return;
  }
  dialog.querySelectorAll(CREDENTIAL_DOM_SELECTORS.credentialTab).forEach((tab) => {
    const active = tab.dataset[CREDENTIAL_DOM_DATASETS.credentialTab] === tabName;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  dialog.querySelectorAll(CREDENTIAL_DOM_SELECTORS.credentialPanel).forEach((panel) => {
    const active = panel.dataset[CREDENTIAL_DOM_DATASETS.credentialPanel] === tabName;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  });
}

export function openCredentialDialog() {
  const dialog = credentialDialog();
  if (!dialog || dialog.open) {
    return;
  }
  dialog.showModal();
}

export function closeCredentialDialog() {
  credentialDialog()?.close();
}
