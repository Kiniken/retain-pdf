import { fetchProtected, buildApiEndpoint } from "../api/http.js";
import { submitJobRequest } from "../api/jobs-submit.js";
import { API_PREFIX } from "../config/api-constants.js";
import {
  defaultModelApiKey,
  defaultModelBaseUrl,
  defaultMineruToken,
  defaultPaddleToken,
} from "../config/runtime.js";
import {
  saveBrowserStoredConfig,
} from "../config/persisted-config.js";
import { defaultAppActionsConfigPort } from "../features/app-actions/config-port.js";

export function createCredentialRuntimeApiConfigPort(overrides = {}) {
  return Object.freeze({
    apiPrefix: API_PREFIX,
    ...overrides,
  });
}

export function createCredentialRuntimeAppActionsConfigPort(overrides = {}) {
  return Object.freeze({
    appActionsConfigPort: defaultAppActionsConfigPort,
    ...overrides,
  });
}

export function createCredentialRuntimeEndpointPort(overrides = {}) {
  return Object.freeze({
    buildApiEndpoint,
    ...overrides,
  });
}

export function createCredentialRuntimeProtectedFetchPort(overrides = {}) {
  return Object.freeze({
    fetchProtected,
    ...overrides,
  });
}

export function createCredentialRuntimeJobsPort(overrides = {}) {
  return Object.freeze({
    submitJobRequest,
    ...overrides,
  });
}

export function createCredentialRuntimeModelDefaultsPort(overrides = {}) {
  return Object.freeze({
    defaultModelApiKey,
    defaultModelBaseUrl,
    ...overrides,
  });
}

export function createCredentialRuntimeOcrDefaultsPort(overrides = {}) {
  return Object.freeze({
    defaultMineruToken,
    defaultPaddleToken,
    ...overrides,
  });
}

export function createCredentialRuntimePersistencePort(overrides = {}) {
  return Object.freeze({
    saveBrowserStoredConfig,
    ...overrides,
  });
}
