import { $ } from "../../dom/query.js";
import { DEFAULT_OCR_PROVIDER, normalizeOcrProvider } from "../../config/providers.js";
import { normalizeBrowserStoredConfig } from "../../config/storage.js";
import { CREDENTIAL_DOM_IDS } from "./credentials-dom-contract.js";

const { hidden: HIDDEN_CREDENTIAL_IDS } = CREDENTIAL_DOM_IDS;

function hiddenInputValue(id = "") {
  if (typeof document === "undefined") {
    return "";
  }
  return $(id)?.value || "";
}

export function readHiddenCredentialDomInputs() {
  return normalizeBrowserStoredConfig({
    ocrProvider: hiddenInputValue(HIDDEN_CREDENTIAL_IDS.ocrProvider) || DEFAULT_OCR_PROVIDER,
    mineruToken: hiddenInputValue(HIDDEN_CREDENTIAL_IDS.mineruToken),
    paddleToken: hiddenInputValue(HIDDEN_CREDENTIAL_IDS.paddleToken),
    modelApiKey: hiddenInputValue(HIDDEN_CREDENTIAL_IDS.modelApiKey),
  });
}

export function normalizeHiddenCredentialPayload(credentialsOrMineruToken, legacyModelApiKey = "") {
  return typeof credentialsOrMineruToken === "object" && credentialsOrMineruToken
    ? credentialsOrMineruToken
    : {
        ocrProvider: DEFAULT_OCR_PROVIDER,
        mineruToken: credentialsOrMineruToken,
        paddleToken: "",
        modelApiKey: legacyModelApiKey,
      };
}

export function mirrorCredentialsToHiddenInputs(credentialsOrMineruToken, legacyModelApiKey = "") {
  if (typeof document === "undefined") {
    return;
  }
  const credentials = normalizeHiddenCredentialPayload(credentialsOrMineruToken, legacyModelApiKey);
  const ocrProvider = normalizeOcrProvider(credentials.ocrProvider);
  const mineruToken = credentials.mineruToken || "";
  const paddleToken = credentials.paddleToken || "";
  const modelApiKey = credentials.modelApiKey || "";

  const providerInput = $(HIDDEN_CREDENTIAL_IDS.ocrProvider);
  const mineruInput = $(HIDDEN_CREDENTIAL_IDS.mineruToken);
  const paddleInput = $(HIDDEN_CREDENTIAL_IDS.paddleToken);
  const apiKeyInput = $(HIDDEN_CREDENTIAL_IDS.modelApiKey);
  if (providerInput) {
    providerInput.value = ocrProvider;
  }
  if (mineruInput) {
    mineruInput.value = mineruToken;
  }
  if (paddleInput) {
    paddleInput.value = paddleToken;
  }
  if (apiKeyInput) {
    apiKeyInput.value = modelApiKey;
  }
}

export function bindHiddenCredentialInputPersistence({
  credentialsStatePort,
  readCredentials = () => credentialsStatePort?.getCredentials?.() || {},
  saveBrowserStoredConfig,
} = {}) {
  const saveCurrentBrowserCredentials = () => {
    credentialsStatePort?.setCredentials?.(readHiddenCredentialDomInputs());
    saveBrowserStoredConfig?.(readCredentials());
  };
  $(HIDDEN_CREDENTIAL_IDS.ocrProvider)?.addEventListener("input", saveCurrentBrowserCredentials);
  $(HIDDEN_CREDENTIAL_IDS.mineruToken)?.addEventListener("input", saveCurrentBrowserCredentials);
  $(HIDDEN_CREDENTIAL_IDS.paddleToken)?.addEventListener("input", saveCurrentBrowserCredentials);
  $(HIDDEN_CREDENTIAL_IDS.modelApiKey)?.addEventListener("input", saveCurrentBrowserCredentials);
}
