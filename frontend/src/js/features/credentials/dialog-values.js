import { createCredentialDialogElementsPort } from "./dialog-elements-port.js";

export function readCredentialDialogValues({
  elementsPort = createCredentialDialogElementsPort(),
} = {}) {
  const {
    mineruInput,
    paddleInput,
    apiKeyInput,
    modelBaseUrlInput,
    modelNameInput,
    mathModeSelect,
  } = elementsPort.elements();
  return {
    mineruToken: mineruInput?.value?.trim() || "",
    paddleToken: paddleInput?.value?.trim() || "",
    modelApiKey: apiKeyInput?.value?.trim() || "",
    modelBaseUrl: modelBaseUrlInput?.value?.trim() || "",
    modelName: modelNameInput?.value?.trim() || "",
    mathMode: mathModeSelect?.value || "direct_typst",
  };
}

export function buildBrowserCredentialConfig({
  values,
  currentOcrProvider,
  defaultModelApiKey,
}) {
  return {
    ocrProvider: currentOcrProvider(),
    mineruToken: values.mineruToken,
    paddleToken: values.paddleToken,
    modelApiKey: values.modelApiKey || defaultModelApiKey?.() || "",
  };
}

export function buildTaskOptionsFromDialogValues({
  values,
  defaultModelBaseUrl,
}) {
  return {
    model: values.modelName,
    baseUrl: values.modelBaseUrl || defaultModelBaseUrl?.() || "",
    mathMode: values.mathMode,
    translateTitles: true,
  };
}

export function ocrTokenFromDialogValues(values = {}, providerId = "") {
  return providerId === "paddle" ? values.paddleToken : values.mineruToken;
}
