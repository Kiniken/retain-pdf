import {
  getOcrProviderDefinition,
  normalizeOcrProvider,
  TRANSLATION_PROVIDER_DEFINITION,
} from "../../config/providers.js";
import {
  runOcrTokenValidation,
} from "./validation.js";
import { handleBrowserDeepSeekValidate as runBrowserDeepSeekValidate } from "./deepseek-flow.js";
import {
  ocrTokenFromDialogValues,
  readCredentialDialogValues,
} from "./dialog-values.js";
import {
  defaultCredentialsStatePort,
} from "./default-state-port.js";
import { syncCredentialDialogFields } from "./dialog-sync.js";
import { ensureOcrCredentialValidationReady } from "./ocr-readiness-flow.js";
import {
  persistBrowserCredentialsFromDialog as persistBrowserCredentials,
  persistDesktopCredentialsFromDialog as persistDesktopCredentials,
} from "./persistence.js";
import { createCredentialRuntimeEnvPort } from "./runtime-env-port.js";
import { createCredentialUploadReadinessPort } from "./upload-readiness-port.js";

export function mountBrowserCredentialsFeature({
  apiPrefix,
  state,
  applyHiddenCredentialInputs,
  defaultMineruToken,
  defaultPaddleToken,
  defaultModelApiKey,
  defaultModelBaseUrl,
  getTaskOptions,
  saveTaskOptions,
  saveBrowserStoredConfig,
  readHiddenCredentialInputs,
  saveDesktopConfig,
  checkApiConnectivity,
  validateOcrToken,
  validateDeepSeekToken,
  queryDeepSeekBalance,
  onCredentialStateChange,
  uploadStatePort,
  credentialsStatePort = defaultCredentialsStatePort,
  runtimeEnvPort,
  balanceStatePort,
  legacyRuntimePort,
  legacyValidationCachePort,
  viewPort,
  dialogElementsPort,
  deepSeekViewPort = {
    elements: dialogElementsPort.elements,
    setTopUpVisible: viewPort.setDeepSeekTopUpVisible,
    setValidationMessage: viewPort.setDeepSeekValidationMessage,
  },
  setupModePort = {
    currentSetupMode: () => Boolean(viewPort.dialogElements()?.dialog?.dataset?.setupMode === "1"),
  },
}) {
  const uploadState = uploadStatePort || createCredentialUploadReadinessPort(state);
  const runtimeEnv = runtimeEnvPort || createCredentialRuntimeEnvPort(state);
  const balanceState = balanceStatePort || {
    resetDeepSeekBalance: () => credentialsStatePort.resetDeepSeekBalance?.(),
  };

  function readUploadState() {
    return uploadState.getSnapshot?.() || {};
  }

  function setCredentialDialogMode(setupMode = false) {
    viewPort.setDialogMode({ setupMode, activateCredentialTab });
  }

  function activateCredentialTab(tabName = "api") {
    viewPort.activateTab(tabName);
  }

  function currentOcrProvider() {
    return normalizeOcrProvider(credentialsStatePort.getCredentials?.().ocrProvider);
  }

  function syncOcrProviderControls(providerId = currentOcrProvider()) {
    const activeProvider = normalizeOcrProvider(providerId);
    viewPort.syncOcrProviderControls(activeProvider);
  }

  function readCurrentCredentials() {
    return credentialsStatePort.getCredentials?.() || readHiddenCredentialInputs();
  }

  function syncBrowserDialogFromCredentialState() {
    syncCredentialDialogFields({
      credentials: readCurrentCredentials(),
      taskOptions: getTaskOptions?.() || {},
      defaultModelBaseUrl,
      elementsPort: dialogElementsPort,
    });
    viewPort.setOcrValidationMessage("", "", "mineru");
    viewPort.setOcrValidationMessage("", "", "paddle");
    viewPort.setDeepSeekValidationMessage("", "");
    viewPort.setDeepSeekTopUpVisible(false);
    balanceState.resetDeepSeekBalance();
    viewPort.setDialogStatus("", "");
  }

  function hasBrowserCredentials() {
    return Boolean(credentialsStatePort.hasComplete?.({
      defaultPaddleToken,
      defaultMineruToken,
    }));
  }

  function openBrowserCredentialsDialog(options = {}) {
    const { dialog } = viewPort.dialogElements();
    if (!dialog) {
      return;
    }
    syncBrowserDialogFromCredentialState();
    setCredentialDialogMode(!!options.setupMode);
    activateCredentialTab("api");
    viewPort.openDialog();
  }

  async function ensureOcrCredentialsReady({ onMissingToken, onInvalidToken } = {}) {
    const provider = currentOcrProvider();
    const readiness = await ensureOcrCredentialValidationReady({
      apiPrefix,
      state,
      providerId: provider,
      credentials: readCurrentCredentials(),
      defaultPaddleToken,
      defaultMineruToken,
      validateOcrToken,
      setOcrValidationMessage: viewPort.setOcrValidationMessage,
      showResult: !runtimeEnv.isDesktopMode(),
      credentialsStatePort,
      legacyRuntimePort,
      legacyValidationCachePort,
    });
    if (readiness.status === "missing_token") {
      onMissingToken?.();
      viewPort.setOcrValidationMessage(readiness.definition.validationMissingMessage, "error", readiness.definition.id);
      return false;
    }
    if (readiness.ok) {
      return true;
    }
    onInvalidToken?.(readiness.result);
    return false;
  }

  function updateCredentialGate({
    workflowNeedsCredentials,
    workflowNeedsUpload,
    refreshSubmitControls,
  }) {
    const uploadEnabled = workflowNeedsUpload();
    const desktopMode = runtimeEnv.isDesktopMode();
    const uploadSnapshot = readUploadState();
    if (desktopMode) {
      if (!viewPort.updateCredentialGate({
        desktopMode: true,
        show: false,
        uploadEnabled,
        uploadReady: !!uploadSnapshot.uploadId,
      })) {
        return;
      }
      refreshSubmitControls();
      return;
    }
    const show = workflowNeedsCredentials() && !hasBrowserCredentials();
    if (!viewPort.updateCredentialGate({
      desktopMode: false,
      show,
      uploadEnabled,
      uploadReady: !!uploadSnapshot.uploadId,
    })) {
      return;
    }
    refreshSubmitControls();
  }

  async function handleBrowserOcrValidate() {
    const provider = currentOcrProvider();
    await runOcrTokenValidation({
      apiPrefix,
      state,
      providerId: provider,
      token: ocrTokenFromDialogValues(readCredentialDialogValues({ elementsPort: dialogElementsPort }), provider),
      validateOcrToken,
      setOcrValidationMessage: viewPort.setOcrValidationMessage,
      showResult: true,
      credentialsStatePort,
      legacyRuntimePort,
    });
  }

  async function handleBrowserDeepSeekValidate() {
    await runBrowserDeepSeekValidate({
      apiPrefix,
      state,
      defaultModelApiKey,
      validateDeepSeekToken,
      queryDeepSeekBalance,
      onBalanceChange: onCredentialStateChange,
      credentialsStatePort,
      legacyRuntimePort,
      viewPort: deepSeekViewPort,
    });
  }

  async function refreshDeepSeekBalance({ silent = true } = {}) {
    return runBrowserDeepSeekValidate({
      apiPrefix,
      state,
      defaultModelApiKey,
      validateDeepSeekToken,
      queryDeepSeekBalance,
      onBalanceChange: onCredentialStateChange,
      silent,
      credentialsStatePort,
      legacyRuntimePort,
      viewPort: deepSeekViewPort,
    });
  }

  async function handleBrowserCredentialSave() {
    const definition = getOcrProviderDefinition(currentOcrProvider());
    const values = readCredentialDialogValues({ elementsPort: dialogElementsPort });
    const ocrToken = ocrTokenFromDialogValues(values, definition.id);
    const modelApiKey = values.modelApiKey;
    if (!ocrToken || !modelApiKey) {
      if (!ocrToken) {
        viewPort.setOcrValidationMessage(definition.validationMissingMessage, "error", definition.id);
      }
      if (!modelApiKey) {
        viewPort.setDeepSeekValidationMessage(TRANSLATION_PROVIDER_DEFINITION.validationMissingMessage, "error");
      }
      return;
    }
    const validation = await runOcrTokenValidation({
      apiPrefix,
      state,
      providerId: definition.id,
      token: ocrToken,
      validateOcrToken,
      setOcrValidationMessage: viewPort.setOcrValidationMessage,
      showResult: true,
      credentialsStatePort,
      legacyRuntimePort,
    });
    if (!validation.ok) {
      return;
    }
    try {
      if (runtimeEnv.isDesktopMode()) {
        await persistDesktopCredentials({
          currentOcrProvider,
          defaultModelApiKey,
          defaultModelBaseUrl,
          saveTaskOptions,
          saveDesktopConfig,
          checkApiConnectivity,
          values,
          setupModePort,
        });
      } else {
        persistBrowserCredentials({
          applyCredentialInputs: applyHiddenCredentialInputs,
          currentOcrProvider,
          defaultModelApiKey,
          defaultModelBaseUrl,
          readCredentialInputs: readCurrentCredentials,
          saveTaskOptions,
          saveBrowserStoredConfig,
          values,
        });
        credentialsStatePort.setCredentials?.(readCurrentCredentials());
      }
    } catch (error) {
      viewPort.setDialogStatus(error?.message || String(error), "error");
      viewPort.setDeepSeekValidationMessage(error?.message || String(error), "error");
      return;
    }
    onCredentialStateChange?.();
    viewPort.setDialogStatus("", "");
    viewPort.closeDialog();
  }

  viewPort.bindEvents({
    resetMineruValidation: () => {
      credentialsStatePort.resetOcrValidationCache?.();
      viewPort.setOcrValidationMessage("", "", "mineru");
    },
    resetPaddleValidation: () => {
      credentialsStatePort.resetOcrValidationCache?.();
      viewPort.setOcrValidationMessage("", "", "paddle");
    },
    resetDeepSeekValidation: () => {
      viewPort.setDeepSeekValidationMessage("", "");
      viewPort.setDeepSeekTopUpVisible(false);
      balanceState.resetDeepSeekBalance();
      onCredentialStateChange?.();
    },
    validateOcr: handleBrowserOcrValidate,
    validateDeepSeek: handleBrowserDeepSeekValidate,
    save: handleBrowserCredentialSave,
    open: openBrowserCredentialsDialog,
    activateCredentialTab,
    changeProvider: (event) => {
      const provider = normalizeOcrProvider(event.currentTarget?.value);
      credentialsStatePort.patchCredentials?.({ ocrProvider: provider });
      viewPort.setHiddenOcrProvider(provider);
      syncOcrProviderControls(provider);
    },
  });

  return {
    activateCredentialTab,
    ensureOcrCredentialsReady,
    hasBrowserCredentials,
    openBrowserCredentialsDialog,
    refreshDeepSeekBalance,
    setDialogStatus: viewPort.setDialogStatus,
    updateCredentialGate,
  };
}
