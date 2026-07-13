import {
  createAppActionsRuntimeEnvPort,
} from "../features/app-actions/runtime-env-port.js";
import {
  createCredentialRuntimeEnvPort,
} from "../features/credentials/runtime-env-port.js";
import {
  defaultCredentialsStatePort,
} from "../features/credentials/default-state-port.js";
import { getUploadStatePort } from "../features/upload/state.js";
import {
  legacyDesktopStateAdapter,
} from "./legacy-state-helper-adapters.js";

export function createCredentialActionStateAdapterPort({
  credentialsStatePort,
  state,
  uploadStatePort,
} = {}) {
  // credential 运行时状态已统一到 app-framework store,不再写回旧全局 state
  const credentialsPort = credentialsStatePort || defaultCredentialsStatePort;
  // 上传状态统一走共享单例 port(getSnapshot/reset/setSubmitBusy 均具备)
  const uploadPort = uploadStatePort || getUploadStatePort();
  return Object.freeze({
    appActionsRuntimeEnvPort: createAppActionsRuntimeEnvPort(state, legacyDesktopStateAdapter),
    appActionsUploadStatePort: uploadPort,
    browserCredentialsBalanceStatePort: {
      resetDeepSeekBalance: () => credentialsPort.resetDeepSeekBalance?.(),
    },
    browserCredentialsLegacyRuntimePort: {
      resetDeepSeekBalance: () => credentialsPort.resetDeepSeekBalance?.(),
      resetOcrValidationCache: () => credentialsPort.resetOcrValidationCache?.(),
      setDeepSeekBalance: (balanceCny, checked = true) => credentialsPort.setDeepSeekBalance?.(balanceCny, checked),
      setOcrValidationCache: (payload = {}) => credentialsPort.setOcrValidationCache?.(payload),
    },
    browserCredentialsLegacyValidationCachePort: {
      hasValidOcrValidationCache: (payload) => credentialsPort.hasValidOcrValidationCache?.(payload),
    },
    browserCredentialsRuntimeEnvPort: createCredentialRuntimeEnvPort(state, legacyDesktopStateAdapter),
    browserCredentialsUploadStatePort: uploadPort,
  });
}
