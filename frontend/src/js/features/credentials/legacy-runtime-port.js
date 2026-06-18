function resetDeepSeekBalance(targetState = {}) {
  Object.assign(targetState, {
    deepseekBalanceCny: null,
    deepseekBalanceChecked: false,
  });
}

function resetOcrValidation(targetState = {}) {
  Object.assign(targetState, {
    validatedOcrProvider: "",
    validatedOcrToken: "",
    ocrValidationStatus: "",
  });
}

function setDeepSeekBalance(targetState = {}, balanceCny, checked = true) {
  Object.assign(targetState, {
    deepseekBalanceCny: Number.isFinite(Number(balanceCny)) ? Number(balanceCny) : null,
    deepseekBalanceChecked: Boolean(checked),
  });
}

function setOcrValidation(targetState = {}, {
  provider = "",
  token = "",
  status = "",
} = {}) {
  Object.assign(targetState, {
    validatedOcrProvider: `${provider || ""}`.trim(),
    validatedOcrToken: `${token || ""}`.trim(),
    ocrValidationStatus: `${status || ""}`.trim(),
  });
}

const defaultCredentialLegacyRuntimeAdapter = Object.freeze({
  resetDeepSeekBalance,
  resetOcrValidationCache: resetOcrValidation,
  setDeepSeekBalance,
  setOcrValidationCache: setOcrValidation,
});

export function createCredentialLegacyRuntimePort(
  targetState,
  adapter = defaultCredentialLegacyRuntimeAdapter,
) {
  return Object.freeze({
    resetDeepSeekBalance: () => {
      if (targetState) {
        adapter.resetDeepSeekBalance(targetState);
      }
    },
    resetOcrValidationCache: () => {
      if (targetState) {
        adapter.resetOcrValidationCache(targetState);
      }
    },
    setDeepSeekBalance: (balanceCny, checked = true) => {
      if (targetState) {
        adapter.setDeepSeekBalance(targetState, balanceCny, checked);
      }
    },
    setOcrValidationCache: (payload = {}) => {
      if (targetState) {
        adapter.setOcrValidationCache(targetState, payload);
      }
    },
  });
}
