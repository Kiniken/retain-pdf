import { createStore } from "../../app-framework/store.js";
import { DEFAULT_OCR_PROVIDER, normalizeOcrProvider } from "../../config/providers.js";
import { normalizeBrowserStoredConfig } from "../../config/storage.js";

function normalizeCredentials(payload = {}) {
  return normalizeBrowserStoredConfig({
    ocrProvider: payload.ocrProvider || DEFAULT_OCR_PROVIDER,
    mineruToken: payload.mineruToken,
    paddleToken: payload.paddleToken,
    modelApiKey: payload.modelApiKey,
  });
}

function normalizeBalance(balanceCny) {
  const value = Number(balanceCny);
  return Number.isFinite(value) ? value : null;
}

function normalizeOcrValidation(payload = {}) {
  return {
    provider: `${payload.provider || ""}`.trim(),
    token: `${payload.token || ""}`.trim(),
    status: `${payload.status || ""}`.trim(),
  };
}

function normalizeRuntime(payload = {}) {
  return {
    deepseekBalanceCny: normalizeBalance(payload.deepseekBalanceCny),
    deepseekBalanceChecked: Boolean(payload.deepseekBalanceChecked),
    ocrValidation: normalizeOcrValidation(payload.ocrValidation),
  };
}

export function createCredentialsStore(initialState = {}) {
  return createStore({
    name: "credentials",
    initialState: {
      credentials: normalizeCredentials(initialState.credentials || initialState),
      runtime: normalizeRuntime(initialState.runtime || initialState),
    },
    actions: {
      setCredentials(currentState, payload = {}) {
        return {
          ...currentState,
          credentials: normalizeCredentials(payload),
        };
      },
      patchCredentials(currentState, payload = {}) {
        return {
          ...currentState,
          credentials: normalizeCredentials({
            ...currentState.credentials,
            ...payload,
          }),
        };
      },
      resetDeepSeekBalance(currentState) {
        return {
          ...currentState,
          runtime: {
            ...currentState.runtime,
            deepseekBalanceCny: null,
            deepseekBalanceChecked: false,
          },
        };
      },
      setDeepSeekBalance(currentState, { balanceCny, checked = true } = {}) {
        return {
          ...currentState,
          runtime: {
            ...currentState.runtime,
            deepseekBalanceCny: normalizeBalance(balanceCny),
            deepseekBalanceChecked: Boolean(checked),
          },
        };
      },
      resetOcrValidationCache(currentState) {
        return {
          ...currentState,
          runtime: {
            ...currentState.runtime,
            ocrValidation: normalizeOcrValidation(),
          },
        };
      },
      setOcrValidationCache(currentState, payload = {}) {
        return {
          ...currentState,
          runtime: {
            ...currentState.runtime,
            ocrValidation: normalizeOcrValidation(payload),
          },
        };
      },
    },
  });
}

export function ocrTokenFromCredentials(credentials = {}, {
  providerId = credentials.ocrProvider,
  defaultPaddleToken,
  defaultMineruToken,
} = {}) {
  const provider = normalizeOcrProvider(providerId);
  const token = provider === "paddle" ? credentials.paddleToken : credentials.mineruToken;
  if (token) {
    return token;
  }
  return provider === "paddle" ? defaultPaddleToken?.() || "" : defaultMineruToken?.() || "";
}

export function hasCompleteCredentials(credentials = {}, options = {}) {
  return Boolean(ocrTokenFromCredentials(credentials, options) && credentials.modelApiKey);
}

export function createCredentialsStatePort({
  initialState = {},
  mirrorToDom,
  mirrorRuntime,
} = {}) {
  const store = createCredentialsStore(initialState);

  function getSnapshot() {
    return store.getSnapshot();
  }

  function getCredentials() {
    return getSnapshot().credentials;
  }

  function getRuntime() {
    return getSnapshot().runtime;
  }

  function setCredentials(payload = {}) {
    const snapshot = store.actions.setCredentials(payload);
    mirrorToDom?.(snapshot.credentials);
    return snapshot.credentials;
  }

  function patchCredentials(payload = {}) {
    const snapshot = store.actions.patchCredentials(payload);
    mirrorToDom?.(snapshot.credentials);
    return snapshot.credentials;
  }

  function getOcrToken(options = {}) {
    return ocrTokenFromCredentials(getCredentials(), options);
  }

  function hasComplete(options = {}) {
    return hasCompleteCredentials(getCredentials(), options);
  }

  function getDeepSeekBalanceState() {
    const runtime = getRuntime();
    return {
      balanceCny: runtime.deepseekBalanceCny,
      balanceChecked: Boolean(runtime.deepseekBalanceChecked),
    };
  }

  function resetDeepSeekBalance() {
    const snapshot = store.actions.resetDeepSeekBalance();
    mirrorRuntime?.(snapshot.runtime);
    return getDeepSeekBalanceState();
  }

  function setDeepSeekBalance(balanceCny, checked = true) {
    const snapshot = store.actions.setDeepSeekBalance({ balanceCny, checked });
    mirrorRuntime?.(snapshot.runtime);
    return getDeepSeekBalanceState();
  }

  function resetOcrValidationCache() {
    const snapshot = store.actions.resetOcrValidationCache();
    mirrorRuntime?.(snapshot.runtime);
    return snapshot.runtime.ocrValidation;
  }

  function setOcrValidationCache(payload = {}) {
    const snapshot = store.actions.setOcrValidationCache(payload);
    mirrorRuntime?.(snapshot.runtime);
    return snapshot.runtime.ocrValidation;
  }

  function hasValidOcrValidationCache({
    provider = "",
    token = "",
    statuses = ["valid", "skipped"],
  } = {}) {
    const validation = getRuntime().ocrValidation;
    return validation.provider === `${provider || ""}`.trim()
      && validation.token === `${token || ""}`.trim()
      && statuses.includes(validation.status);
  }

  return {
    getDeepSeekBalanceState,
    getCredentials,
    getOcrToken,
    getRuntime,
    getSnapshot,
    hasComplete,
    hasValidOcrValidationCache,
    patchCredentials,
    resetDeepSeekBalance,
    resetOcrValidationCache,
    setCredentials,
    setDeepSeekBalance,
    setOcrValidationCache,
    subscribe: store.subscribe,
    store,
  };
}
