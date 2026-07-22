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
}: any) {
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
}: any) {
  const provider = currentOcrProvider();
  const paddleToken = values.paddleToken;
  // 与浏览器一致：只存用户在设置里填的 Key，不从 runtime 静默回填
  void defaultModelApiKey;
  const modelApiKey = `${values.modelApiKey || ""}`.trim();
  await saveDesktopConfig?.(
    {
      ocrProvider: provider,
      paddleToken,
      modelApiKey,
      markConfigured: setupModePort.currentSetupMode(),
    },
    async () => {
      await checkApiConnectivity?.();
    },
  );
  saveTaskOptions?.(buildTaskOptionsFromDialogValues({
    values,
    defaultModelBaseUrl,
  }));
}
