export function createCredentialsPorts(features) {
  return {
    getBrowserCredentialsFeature: () => features.browserCredentialsFeature,
    ensureOcrCredentialsReady: (options) => (
      features.browserCredentialsFeature?.ensureOcrCredentialsReady?.(options)
    ),
    hasBrowserCredentials: () => Boolean(features.browserCredentialsFeature?.hasBrowserCredentials?.()),
    openBrowserCredentialsDialog: (options) => (
      features.browserCredentialsFeature?.openBrowserCredentialsDialog?.(options)
    ),
    refreshDeepSeekBalance: (options) => (
      features.browserCredentialsFeature?.refreshDeepSeekBalance?.(options)
    ),
    updateCredentialGate: (options) => (
      features.browserCredentialsFeature?.updateCredentialGate?.(options)
    ),
  };
}
