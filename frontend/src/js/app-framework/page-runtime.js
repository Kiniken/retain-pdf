import { createRetainPdfApp } from "./app.js";

export function createPageRuntime({
  app = null,
  onError = null,
  onStop = null,
  stores = {},
  resources = {},
  commands = null,
} = {}) {
  const runtimeApp = app || createRetainPdfApp({
    stores,
    resources,
    commands,
  });
  const cleanupCallbacks = new Set();
  let started = false;

  function onCleanup(callback) {
    if (typeof callback !== "function") {
      return () => {};
    }
    cleanupCallbacks.add(callback);
    return () => cleanupCallbacks.delete(callback);
  }

  async function start(initializer) {
    if (started) {
      return runtimeApp.context;
    }
    started = true;
    const context = runtimeApp.start();
    try {
      if (typeof initializer === "function") {
        await initializer(context, runtimeApp);
      }
    } catch (error) {
      if (typeof onError === "function") {
        onError(error, context);
        return context;
      }
      throw error;
    }
    return context;
  }

  function stop() {
    for (const callback of [...cleanupCallbacks].reverse()) {
      callback(runtimeApp.context);
    }
    cleanupCallbacks.clear();
    runtimeApp.stop();
    started = false;
    if (typeof onStop === "function") {
      onStop(runtimeApp.context);
    }
  }

  return Object.freeze({
    app: runtimeApp,
    context: runtimeApp.context,
    onCleanup,
    start,
    stop,
    isStarted: () => started,
  });
}
