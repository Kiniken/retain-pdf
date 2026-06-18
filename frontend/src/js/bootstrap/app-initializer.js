import { createPageRuntime } from "../app-framework/page-runtime.js";
import {
  defaultAppInitializerPorts,
} from "./app-initializer-ports.js";
import {
  initializePage,
  renderStartupError,
  runPostStartup,
} from "./app-initializer-flow.js";

export function createAppInitializer({
  ports = defaultAppInitializerPorts,
  bootstrapDesktopFn = ports.bootstrapDesktop,
  desktopMode = ports.desktopMode,
  initializePageFn = () => initializePage({ ports }),
  pageRuntime = createPageRuntime({ onError: (error) => renderStartupError(error, ports) }),
} = {}) {
  return function initializeApp() {
    pageRuntime.start(async () => {
      const initialized = await initializePageFn();
      runPostStartup(initialized, {
        ports,
        bootstrapDesktopFn,
        desktopMode,
      });
    });
    return pageRuntime;
  };
}

export function initializeApp() {
  return createAppInitializer()();
}
