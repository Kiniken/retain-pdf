import test from "node:test";
import assert from "node:assert/strict";

import { createPageRuntime } from "../src/js/app-framework/page-runtime.js";
import { createAppInitializer } from "../src/js/bootstrap/app-initializer.js";
import {
  initializePage,
  renderStartupError,
  runPostStartup,
} from "../src/js/bootstrap/app-initializer-flow.js";
import {
  initializeStartupFlows,
} from "../src/js/bootstrap/app-initializer-startup-flow.js";

function nextTick() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

test("app initializer starts through page runtime and runs browser startup hooks", async () => {
  const calls = [];
  const runtime = createPageRuntime({
    onError(error) {
      calls.push(["error", error.message]);
    },
  });
  const initializeApp = createAppInitializer({
    desktopMode: () => false,
    initializePageFn: async () => ({
      persistedConfig: { mode: "browser" },
      features: {
        checkApiConnectivity: async () => {
          calls.push(["check-api"]);
        },
        workflowFeature: {
          updateCredentialGate() {
            calls.push(["credential-gate"]);
          },
        },
      },
    }),
    pageRuntime: runtime,
  });

  const startedRuntime = initializeApp();
  await nextTick();

  assert.equal(startedRuntime, runtime);
  assert.equal(runtime.isStarted(), true);
  assert.deepEqual(calls, [
    ["check-api"],
    ["credential-gate"],
  ]);
});

test("app initializer routes startup failures through page runtime", async () => {
  const calls = [];
  const runtime = createPageRuntime({
    onError(error) {
      calls.push(["error", error.message]);
    },
  });
  const initializeApp = createAppInitializer({
    initializePageFn: async () => {
      throw new Error("config failed");
    },
    pageRuntime: runtime,
  });

  initializeApp();
  await nextTick();

  assert.equal(runtime.isStarted(), true);
  assert.deepEqual(calls, [
    ["error", "config failed"],
  ]);
});

test("app initializer flow initializes page through explicit ports", async () => {
  const calls = [];
  const state = { marker: "initializer-state" };
  const persistedConfig = {
    browserConfig: {
      modelApiKey: "sk-flow",
      ocrProvider: "paddle",
    },
    developerConfig: {
      workflow: "book",
    },
  };
  const features = {
    appShellFeature: {
      initializeIdleView: () => calls.push(["idle"]),
    },
    jobRuntimeFeature: {
      startPolling: () => {},
    },
  };
  const ports = {
    applyHiddenCredentialInputs: (payload) => calls.push(["hidden", payload.modelApiKey, payload.ocrProvider]),
    defaultMineruToken: () => "mineru",
    defaultModelApiKey: () => "sk-default",
    defaultOcrProvider: () => "mineru",
    defaultPaddleToken: () => "paddle",
    createHomeStatePort: () => ({ kind: "home" }),
    createRecentJobsReaderPort: () => ({ kind: "reader" }),
    createRecentJobsRuntimePort: () => ({ kind: "runtime" }),
    createRecentJobsStatePort: () => ({ kind: "recent" }),
    fetchJobList: async () => {},
    fetchJobPayload: async () => {},
    fetchLibraryBookList: async () => {},
    fetchProtected: async () => {},
    getRequestedJobIdFromLocation: () => "",
    getRequestedReaderJobIdFromLocation: () => "",
    loadPersistedConfig: async () => {
      calls.push(["load-config"]);
      return persistedConfig;
    },
    mountRecentJobsFeature: (payload) => calls.push(["recent", payload.homeStatePort.kind, payload.recentJobsStatePort.kind]),
    mountApplicationFeatures: ({ state: mountedState }) => {
      calls.push(["mount", mountedState.marker]);
      return features;
    },
    setDeveloperConfig: (targetState, config) => calls.push(["developer", targetState.marker, config.workflow]),
    setText: () => {},
    setTimeoutFn: () => {},
    state,
  };

  const initialized = await initializePage({ ports });

  assert.deepEqual(initialized, { persistedConfig, features });
  assert.deepEqual(calls, [
    ["load-config"],
    ["developer", "initializer-state", "book"],
    ["hidden", "sk-flow", "paddle"],
    ["mount", "initializer-state"],
    ["idle"],
    ["recent", "home", "recent"],
  ]);
});

test("app initializer post startup flow separates desktop and browser branches", async () => {
  const calls = [];
  const desktopFeatures = {
    workflowFeature: {
      applyWorkflowMode: () => calls.push(["workflow-mode"]),
    },
  };
  runPostStartup(
    {
      persistedConfig: { mode: "desktop" },
      features: desktopFeatures,
    },
    {
      bootstrapDesktopFn: async (config) => calls.push(["desktop", config.mode]),
      desktopMode: () => true,
      onError: (error) => calls.push(["desktop-error", error.message]),
    },
  );
  await nextTick();

  const browserFeatures = {
    checkApiConnectivity: async () => calls.push(["check-api"]),
    workflowFeature: {
      updateCredentialGate: () => calls.push(["credential-gate"]),
    },
  };
  runPostStartup(
    {
      persistedConfig: { mode: "browser" },
      features: browserFeatures,
    },
    {
      desktopMode: () => false,
    },
  );
  await nextTick();

  const ports = {
    setText: (id, text) => calls.push(["text", id, text]),
  };
  renderStartupError(new Error("startup failed"), ports);
  assert.deepEqual(calls.slice(0, 4), [
    ["desktop", "desktop"],
    ["workflow-mode"],
    ["check-api"],
    ["credential-gate"],
  ]);
  assert.equal(calls[4][0], "text");
  assert.equal(calls[4][1], "error-box");
  assert.equal(calls[4][2].kind, "error-diagnostic");
  assert.equal(calls[4][2].summary, "启动前端页面失败：startup failed");
  assert.match(calls[4][2].diagnostic, /操作: 启动前端页面/);
});

test("app initializer startup flow maps feature and port dependencies to startup routes", () => {
  const calls = [];
  const features = {
    appShellFeature: { marker: "shell" },
    jobRuntimeFeature: { marker: "runtime" },
    libraryEventPort: { marker: "library-events" },
  };
  const ports = {
    state: { marker: "state" },
    fetchProtected: () => {},
    deleteLibraryBook: () => {},
    fetchJobList: () => {},
    fetchJobPayload: () => {},
    fetchLibraryBookList: () => {},
    setText: () => {},
  };

  initializeStartupFlows({
    features,
    ports,
    initializeIdleAndRecentJobsFn: (payload) => calls.push(["idle", payload]),
    bootstrapStartupRouteFn: (payload) => calls.push(["route", payload]),
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], "idle");
  assert.equal(calls[0][1].appShellFeature, features.appShellFeature);
  assert.equal(calls[0][1].jobRuntimeFeature, features.jobRuntimeFeature);
  assert.equal(calls[0][1].libraryEventPort, features.libraryEventPort);
  assert.equal(calls[0][1].fetchLibraryBookList, ports.fetchLibraryBookList);
  assert.equal(calls[1][0], "route");
  assert.equal(calls[1][1].state, ports.state);
  assert.equal(calls[1][1].fetchProtected, ports.fetchProtected);
  assert.equal(calls[1][1].jobRuntimeFeature, features.jobRuntimeFeature);
  assert.equal(calls[1][1].setText, ports.setText);
});
