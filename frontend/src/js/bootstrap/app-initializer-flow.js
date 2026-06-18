import {
  initializeStartupFlows,
} from "./app-initializer-startup-flow.js";
import { applyPersistedConfig } from "./config-bootstrap.js";
import {
  defaultAppInitializerPorts,
} from "./app-initializer-ports.js";
import { buildErrorDiagnostic } from "../utils/error-diagnostics.js";

export function renderStartupError(error, ports = defaultAppInitializerPorts) {
  ports.setText("error-box", buildErrorDiagnostic(error, {
    operation: "启动前端页面",
    url: globalThis.location?.href,
  }));
}

export async function initializePage({
  ports = defaultAppInitializerPorts,
} = {}) {
  const persistedConfig = await ports.loadPersistedConfig();
  applyPersistedConfig(ports.state, persistedConfig, ports);
  const features = ports.mountApplicationFeatures({ state: ports.state });

  initializeStartupFlows({
    features,
    ports,
  });

  return { persistedConfig, features };
}

export function runPostStartup({
  persistedConfig,
  features,
}, {
  ports = defaultAppInitializerPorts,
  bootstrapDesktopFn = ports.bootstrapDesktop,
  desktopMode = ports.desktopMode,
  onError = (error) => renderStartupError(error, ports),
} = {}) {
  if (desktopMode()) {
    bootstrapDesktopFn(persistedConfig)
      .then(() => {
        features.workflowFeature?.applyWorkflowMode();
      })
      .catch(onError);
    return;
  }
  features.checkApiConnectivity().catch(() => {});
  features.workflowFeature?.updateCredentialGate();
}
