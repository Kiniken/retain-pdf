const defaultCredentialBalanceAdapter = Object.freeze({
  resetDeepSeekBalance: (targetState = {}) => {
    Object.assign(targetState, {
      deepseekBalanceCny: null,
      deepseekBalanceChecked: false,
    });
  },
});

export function createCredentialBalanceStatePort(
  targetState,
  credentialsStatePort = null,
  adapter = defaultCredentialBalanceAdapter,
) {
  return Object.freeze({
    resetDeepSeekBalance: () => {
      adapter.resetDeepSeekBalance(targetState);
      credentialsStatePort?.resetDeepSeekBalance?.();
    },
  });
}
