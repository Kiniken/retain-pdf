import {
  buildBrowserCredentialConfig,
  buildTaskOptionsFromDialogValues,
} from "./dialog-values.js";
import { createCredentialSetupModePort } from "./setup-mode-port.js";

export function persistBrowserCredentialsFromDialog({
  applyHiddenCredentialInputs,
  applyCredentialInputs = applyHiddenCredentialInputs,
  currentOcrProvider,
  defaultModelApiKey,
  defaultModelBaseUrl,
  readHiddenCredentialInputs,
  readCredentialInputs = readHiddenCredentialInputs,
  saveTaskOptions,
  saveBrowserStoredConfig,
  values,
}) {
  applyCredentialInputs(buildBrowserCredentialConfig({
    values,
    currentOcrProvider,
    defaultModelApiKey,
  }));
  saveTaskOptions?.(buildTaskOptionsFromDialogValues({
    values,
    defaultModelBaseUrl,
  }));
  saveBrowserStoredConfig(readCredentialInputs());
}

export async function persistDesktopCredentialsFromDialog({
  currentOcrProvider,
  defaultModelApiKey,
  defaultModelBaseUrl,
  saveTaskOptions,
  saveDesktopConfig,
  checkApiConnectivity,
  values,
  setupModePort = createCredentialSetupModePort(),
}) {
  const provider = currentOcrProvider();
  const mineruToken = values.mineruToken;
  const paddleToken = values.paddleToken;
  const modelApiKey = values.modelApiKey || defaultModelApiKey?.() || "";
  await saveDesktopConfig?.(
    mineruToken,
    modelApiKey,
    async () => {
      await checkApiConnectivity?.();
    },
    {
      ocrProvider: provider,
      paddleToken,
      markConfigured: setupModePort.currentSetupMode(),
    },
  );
  saveTaskOptions?.(buildTaskOptionsFromDialogValues({
    values,
    defaultModelBaseUrl,
  }));
}
