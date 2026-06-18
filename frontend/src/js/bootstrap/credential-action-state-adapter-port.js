import {
  createAppActionsRuntimeEnvPort,
} from "../features/app-actions/runtime-env-port.js";
import {
  createAppActionsUploadStatePort,
} from "../features/app-actions/upload-state-port.js";
import {
  createCredentialRuntimeEnvPort,
} from "../features/credentials/runtime-env-port.js";
import {
  createCredentialUploadReadinessPort,
} from "../features/credentials/upload-readiness-port.js";
import {
  createCredentialBalanceStatePort,
} from "../features/credentials/balance-state-port.js";
import {
  createCredentialLegacyRuntimePort,
} from "../features/credentials/legacy-runtime-port.js";
import {
  legacyDesktopStateAdapter,
  legacyCredentialRuntimeStateAdapter,
  legacyUploadStateAdapter,
} from "./legacy-state-helper-adapters.js";

export function createCredentialActionStateAdapterPort({
  credentialsStatePort,
  state,
  uploadStatePort,
} = {}) {
  return Object.freeze({
    appActionsRuntimeEnvPort: createAppActionsRuntimeEnvPort(state, legacyDesktopStateAdapter),
    appActionsUploadStatePort: uploadStatePort
      || createAppActionsUploadStatePort(state, legacyUploadStateAdapter),
    browserCredentialsBalanceStatePort: createCredentialBalanceStatePort(
      state,
      credentialsStatePort,
      legacyCredentialRuntimeStateAdapter,
    ),
    browserCredentialsLegacyRuntimePort: createCredentialLegacyRuntimePort(
      state,
      legacyCredentialRuntimeStateAdapter,
    ),
    browserCredentialsLegacyValidationCachePort: {
      hasValidOcrValidationCache: (payload) => (
        legacyCredentialRuntimeStateAdapter.hasValidOcrValidationCache(state, payload)
      ),
    },
    browserCredentialsRuntimeEnvPort: createCredentialRuntimeEnvPort(state, legacyDesktopStateAdapter),
    browserCredentialsUploadStatePort: uploadStatePort
      || createCredentialUploadReadinessPort(state, legacyUploadStateAdapter),
  });
}
