import { createPageRuntime } from "../app-framework/page-runtime.js";

export function createReaderInitializer({
  initializeReader,
  onError = null,
  pageRuntime = createPageRuntime({ onError }),
} = {}) {
  if (typeof initializeReader !== "function") {
    throw new TypeError("createReaderInitializer requires initializeReader.");
  }

  return function startReader() {
    pageRuntime.start(initializeReader);
    return pageRuntime;
  };
}
