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

const defaultCredentialRuntimeStateAdapter = Object.freeze({
  resetDeepSeekBalance,
  resetOcrValidationCache: resetOcrValidation,
  setDeepSeekBalance,
  setOcrValidationCache: setOcrValidation,
});

export function mirrorCredentialRuntimeToLegacyState(
  runtime = {},
  legacyState = null,
  adapter = defaultCredentialRuntimeStateAdapter,
) {
  if (!legacyState) {
    return;
  }
  if (runtime.deepseekBalanceChecked) {
    adapter.setDeepSeekBalance(legacyState, runtime.deepseekBalanceCny, true);
  } else {
    adapter.resetDeepSeekBalance(legacyState);
  }
  const validation = runtime.ocrValidation || {};
  if (validation.provider || validation.token || validation.status) {
    adapter.setOcrValidationCache(legacyState, validation);
  } else {
    adapter.resetOcrValidationCache(legacyState);
  }
}

export function createCredentialRuntimeStatePort({
  mirrorRuntime = mirrorCredentialRuntimeToLegacyState,
  adapter = defaultCredentialRuntimeStateAdapter,
} = {}) {
  return Object.freeze({
    mirrorRuntime: (runtime, legacyState) => mirrorRuntime(runtime, legacyState, adapter),
  });
}

export const defaultCredentialRuntimeStatePort = createCredentialRuntimeStatePort();
