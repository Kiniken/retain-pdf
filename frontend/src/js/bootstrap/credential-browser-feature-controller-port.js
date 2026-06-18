import { mountBrowserCredentialsFeature } from "../features/credentials/browser.js";

export function createCredentialBrowserFeatureControllerPort(overrides = {}) {
  return Object.freeze({
    mountBrowserCredentialsFeature,
    ...overrides,
  });
}
