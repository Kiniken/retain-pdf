import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveSubmitReadiness,
  SUBMIT_BLOCK_REASONS,
} from "../src/js/contracts/submit-readiness-contract.js";
import { resolveSubmitControlState } from "../src/js/features/workflow/submit-controls.js";
import {
  runSubmitFlow,
} from "../src/js/features/app-actions/submit-flow.js";
import {
  mountAppActionsFeature,
} from "../src/js/features/app-actions/controller.js";
import {
  createAppActionsConfigPort,
} from "../src/js/features/app-actions/config-port.js";
import {
  createAppActionsViewPort,
} from "../src/js/features/app-actions/action-view-port.js";
import { APP_EVENTS } from "../src/js/contracts/app-contract.js";

const workflowNeedsUpload = (workflow) => workflow !== "render";
const workflowNeedsCredentials = (workflow) => workflow !== "render";
const workflowSubmitLabel = (workflow) => workflow === "render" ? "开始渲染" : "开始翻译";

test("resolveSubmitReadiness allows mock submissions without source or credentials", () => {
  const readiness = resolveSubmitReadiness({
    workflow: "book",
    isMock: true,
    needsUpload: true,
    needsCredentials: true,
  });

  assert.equal(readiness.ready, true);
  assert.equal(readiness.reason, SUBMIT_BLOCK_REASONS.NONE);
});

test("resolveSubmitReadiness reports missing browser credentials before source checks", () => {
  const readiness = resolveSubmitReadiness({
    workflow: "book",
    desktopMode: false,
    hasBrowserCredentials: false,
    needsUpload: true,
    needsCredentials: true,
  });

  assert.equal(readiness.ready, false);
  assert.equal(readiness.credentialsMissing, true);
  assert.equal(readiness.reason, SUBMIT_BLOCK_REASONS.MISSING_CREDENTIALS);
});

test("resolveSubmitReadiness reports missing upload for upload workflows", () => {
  const readiness = resolveSubmitReadiness({
    workflow: "book",
    desktopMode: false,
    hasBrowserCredentials: true,
    needsUpload: true,
    needsCredentials: true,
  });

  assert.equal(readiness.ready, false);
  assert.equal(readiness.reason, SUBMIT_BLOCK_REASONS.MISSING_UPLOAD);
});

test("resolveSubmitReadiness reports missing render source for render workflows", () => {
  const readiness = resolveSubmitReadiness({
    workflow: "render",
    needsUpload: false,
    needsCredentials: false,
  });

  assert.equal(readiness.ready, false);
  assert.equal(readiness.reason, SUBMIT_BLOCK_REASONS.MISSING_RENDER_SOURCE);
});

test("resolveSubmitReadiness reports budget blocking after source is ready", () => {
  const readiness = resolveSubmitReadiness({
    workflow: "book",
    uploadId: "upload-1",
    hasBrowserCredentials: true,
    needsUpload: true,
    needsCredentials: true,
    budgetBlocking: true,
  });

  assert.equal(readiness.ready, false);
  assert.equal(readiness.reason, SUBMIT_BLOCK_REASONS.BUDGET_BLOCKING);
});

test("resolveSubmitControlState consumes shared submit readiness", () => {
  const state = resolveSubmitControlState({
    workflow: "book",
    isMock: false,
    desktopMode: false,
    uploadId: "upload-1",
    renderSourceJobId: "",
    hasBrowserCredentials: true,
    workflowNeedsUpload,
    workflowNeedsCredentials,
    workflowSubmitLabel,
  });

  assert.equal(state.disabled, false);
  assert.equal(state.actionVisible, true);
  assert.equal(state.pageRangeVisible, true);
  assert.equal(state.label, "开始翻译");
  assert.equal(state.readiness.ready, true);
});

test("resolveSubmitControlState disables submit when budget blocks", () => {
  const state = resolveSubmitControlState({
    workflow: "book",
    isMock: false,
    desktopMode: false,
    uploadId: "upload-1",
    renderSourceJobId: "",
    hasBrowserCredentials: true,
    budgetBlocking: true,
    workflowNeedsUpload,
    workflowNeedsCredentials,
    workflowSubmitLabel,
  });

  assert.equal(state.disabled, true);
  assert.equal(state.actionVisible, true);
  assert.equal(state.readiness.reason, SUBMIT_BLOCK_REASONS.BUDGET_BLOCKING);
});

test("resolveSubmitControlState preserves render source disabled behavior", () => {
  const state = resolveSubmitControlState({
    workflow: "render",
    isMock: false,
    desktopMode: false,
    uploadId: "",
    renderSourceJobId: "",
    hasBrowserCredentials: false,
    workflowNeedsUpload,
    workflowNeedsCredentials,
    workflowSubmitLabel,
  });

  assert.equal(state.disabled, true);
  assert.equal(state.actionVisible, true);
  assert.equal(state.pageRangeVisible, false);
  assert.equal(state.label, "开始渲染");
  assert.equal(state.readiness.reason, SUBMIT_BLOCK_REASONS.MISSING_RENDER_SOURCE);
});

function submitFlowHarness(overrides = {}) {
  const calls = [];
  const state = {};
  const libraryEventPort = {
    publishJobCreated: (payload) => calls.push(["publishJobCreated", payload.job_id]),
    requestRefresh: (options) => calls.push(["requestRefresh", options.delay, Boolean(options.force)]),
  };
  const documentRef = {
    dispatchEvent: (event) => calls.push(["dispatchEvent", event.type]),
  };
  const windowRef = {
    setTimeout: (callback, delay) => {
      calls.push(["setTimeout", delay]);
      callback();
    },
  };
  const options = {
    workflow: "book",
    desktopMode: false,
    configPort: createAppActionsConfigPort({
      resolveApiBase: () => "http://api.example.test",
      isMock: () => false,
    }),
    state,
    apiPrefix: "/api",
    uploadId: "upload-1",
    desktopConfigured: true,
    openSetupDialog: () => calls.push(["openSetupDialog"]),
    openBrowserCredentialsDialog: () => calls.push(["openCredentials"]),
    setText: (id, text) => calls.push(["setText", id, text]),
    submitJobRequest: async (_apiPrefix, payload) => {
      calls.push(["submitJobRequest", payload.workflow]);
      return { job_id: "job-1", status: "running" };
    },
    workflowNeedsUpload,
    workflowNeedsCredentials,
    currentRenderSourceJobId: () => "",
    currentBudgetState: () => ({ visible: false, blocking: false, balanceChecked: true }),
    collectRunPayload: () => ({ workflow: "book", source: { upload_id: "upload-1" } }),
    validateBeforeSubmit: () => true,
    ensureOcrCredentialsReady: async () => true,
    hasBrowserCredentials: () => true,
    refreshDeepSeekBalance: async () => ({ status: "ok" }),
    syncCurrentJobSnapshot: (_state, payload, jobId, meta) => calls.push(["sync", jobId, meta.startedAt]),
    renderJob: (payload) => calls.push(["renderJob", payload.job_id]),
    startJobPolling: (jobId) => calls.push(["startPolling", jobId]),
    libraryEventPort,
    isMissingUploadError: (error) => `${error?.message || ""}`.includes("upload not found"),
    handleMissingUploadError: () => calls.push(["handleMissingUploadError"]),
    documentRef,
    windowRef,
    now: () => "2026-06-16T00:00:00.000Z",
    ...overrides,
  };
  return { calls, options, state };
}

test("runSubmitFlow submits and publishes runtime and library updates", async () => {
  const { calls, options } = submitFlowHarness();
  const result = await runSubmitFlow(options);

  assert.equal(result.status, "submitted");
  assert.deepEqual(calls, [
    ["setText", "error-box", "-"],
    ["submitJobRequest", "book"],
    ["publishJobCreated", "job-1"],
    ["setTimeout", 200],
    ["requestRefresh", 0, true],
    ["setTimeout", 1500],
    ["requestRefresh", 0, true],
    ["setTimeout", 4000],
    ["requestRefresh", 0, true],
    ["dispatchEvent", APP_EVENTS.openTranslationWorkflow],
    ["sync", "job-1", "2026-06-16T00:00:00.000Z"],
    ["renderJob", "job-1"],
    ["startPolling", "job-1"],
  ]);
});

test("runSubmitFlow mock submissions publish the same library lifecycle as real submissions", async () => {
  const { calls, options } = submitFlowHarness({
    configPort: createAppActionsConfigPort({
      resolveApiBase: () => "http://api.example.test",
      isMock: () => true,
    }),
    submitJobRequest: async (_apiPrefix, payload) => {
      calls.push(["submitJobRequest", payload.workflow, payload.mock]);
      return { job_id: "mock-job-1", status: "running" };
    },
  });
  const result = await runSubmitFlow(options);

  assert.equal(result.status, "submitted");
  assert.equal(result.mock, true);
  assert.deepEqual(calls, [
    ["setText", "error-box", "-"],
    ["submitJobRequest", "book", true],
    ["publishJobCreated", "mock-job-1"],
    ["setTimeout", 200],
    ["requestRefresh", 0, true],
    ["setTimeout", 1500],
    ["requestRefresh", 0, true],
    ["setTimeout", 4000],
    ["requestRefresh", 0, true],
    ["dispatchEvent", APP_EVENTS.openTranslationWorkflow],
    ["sync", "mock-job-1", "2026-06-16T00:00:00.000Z"],
    ["renderJob", "mock-job-1"],
    ["startPolling", "mock-job-1"],
  ]);
});

test("runSubmitFlow blocks missing browser credentials before submit", async () => {
  const { calls, options } = submitFlowHarness({
    hasBrowserCredentials: () => false,
  });
  const result = await runSubmitFlow(options);

  assert.equal(result.status, "blocked");
  assert.equal(result.readiness.reason, SUBMIT_BLOCK_REASONS.MISSING_CREDENTIALS);
  assert.deepEqual(calls, [
    ["setText", "error-box", "请先填写当前 OCR Provider 凭证。"],
    ["openCredentials"],
  ]);
});

test("runSubmitFlow stops when DeepSeek budget is blocking", async () => {
  const { calls, options } = submitFlowHarness({
    currentBudgetState: () => ({
      visible: true,
      blocking: true,
      balanceChecked: true,
      message: "预计 10 元，余额 1 元",
    }),
  });
  const result = await runSubmitFlow(options);

  assert.equal(result.status, "blocked");
  assert.equal(result.readiness.reason, SUBMIT_BLOCK_REASONS.BUDGET_BLOCKING);
  assert.deepEqual(calls, [
    ["setText", "error-box", "余额不足：预计 10 元，余额 1 元。请充值后再提交。"],
  ]);
});

test("runSubmitFlow handles stale upload submit failures through injected handler", async () => {
  const { calls, options } = submitFlowHarness({
    submitJobRequest: async () => {
      throw new Error("upload not found");
    },
  });
  const result = await runSubmitFlow(options);

  assert.equal(result.status, "missing_upload");
  assert.deepEqual(calls, [
    ["setText", "error-box", "-"],
    ["handleMissingUploadError"],
  ]);
});

test("runSubmitFlow reports submit failures with copyable diagnostics", async () => {
  const calls = [];
  const result = await runSubmitFlow({
    workflow: "book",
    desktopMode: false,
    configPort: { isMock: () => false },
    state: {},
    apiPrefix: "/api/v1",
    uploadId: "upload-1",
    desktopConfigured: false,
    setText: (id, value) => calls.push(["setText", id, value]),
    submitJobRequest: async () => {
      const error = new Error("backend 500");
      error.status = 500;
      throw error;
    },
    workflowNeedsUpload: () => true,
    workflowNeedsCredentials: () => false,
    currentRenderSourceJobId: () => "",
    currentBudgetState: () => ({ visible: false, blocking: false, balanceChecked: true }),
    collectRunPayload: () => ({ workflow: "book", source: { upload_id: "upload-1" } }),
    validateBeforeSubmit: () => true,
    ensureOcrCredentialsReady: async () => true,
    hasBrowserCredentials: () => true,
    refreshDeepSeekBalance: async () => ({ status: "ok" }),
  });

  assert.equal(result.status, "error");
  const errorCall = calls.find((call) => call[0] === "setText" && call[1] === "error-box" && call[2] !== "-");
  assert.equal(errorCall[2].kind, "error-diagnostic");
  assert.equal(errorCall[2].summary, "提交 PDF 任务失败：backend 500");
  assert.match(errorCall[2].diagnostic, /HTTP 状态码: 500/);
  assert.match(errorCall[2].diagnostic, /upload_id: upload-1/);
});

test("app actions config port owns api base label", () => {
  const port = createAppActionsConfigPort({
    resolveApiBase: () => "http://api.example.test",
    isMock: () => true,
  });

  assert.equal(port.apiBaseLabel(), "http://api.example.test");
  assert.equal(port.isMock(), true);
});

test("app actions view port owns submit busy and delegates stale upload reset", () => {
  const calls = [];
  const port = createAppActionsViewPort({
    setSubmitBusyState: (busy) => calls.push(["busy", busy]),
    resetMissingUpload: (payload) => calls.push(["missingUpload", Boolean(payload.uploadStatePort)]),
  });

  port.setSubmitBusyState(true);
  port.resetMissingUpload({ uploadStatePort: {} });

  assert.deepEqual(calls, [
    ["busy", true],
    ["missingUpload", true],
  ]);
});

test("app actions connectivity error uses injected config port", async () => {
  const messages = [];
  const feature = mountAppActionsFeature({
    state: {},
    apiPrefix: "/api",
    buildApiEndpoint: () => "/health",
    setText: (id, text) => messages.push([id, text]),
    openDesktopOutputDirectory: async () => {},
    resetUploadedFile: () => {},
    currentWorkflow: () => "book",
    libraryEventPort: {},
    configPort: createAppActionsConfigPort({
      resolveApiBase: () => "http://custom-api.example",
    }),
  });
  const previousFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("network down");
  };
  try {
    await assert.rejects(
      () => feature.checkApiConnectivity(),
      /http:\/\/custom-api\.example/,
    );
  } finally {
    global.fetch = previousFetch;
  }

  assert.deepEqual(messages, [[
    "error-box",
    "当前前端无法连接后端。API Base: http://custom-api.example。请确认本地服务已经启动，然后重试。",
  ]]);
});

test("app actions controller routes submit busy and missing upload through view port", async () => {
  const calls = [];
  const state = {};
  const feature = mountAppActionsFeature({
    state,
    apiPrefix: "/api",
    buildApiEndpoint: () => "/health",
    setText: (id, text) => calls.push(["setText", id, text]),
    openDesktopOutputDirectory: async () => {},
    resetUploadedFile: () => calls.push(["resetUploadedFile"]),
    configPort: createAppActionsConfigPort({
      resolveApiBase: () => "http://localhost",
      isMock: () => false,
    }),
    viewPort: createAppActionsViewPort({
      setSubmitBusyState: (busy) => calls.push(["busy", busy]),
      resetMissingUpload: (payload) => {
        calls.push(["missingUpload", Boolean(payload.uploadStatePort)]);
        payload.uploadStatePort.reset({ includePageRange: false });
        payload.setText("error-box", "reset through port");
      },
    }),
    submitFlow: {
      openSetupDialog: () => calls.push(["openSetupDialog"]),
      openBrowserCredentialsDialog: () => calls.push(["openCredentials"]),
      renderJob: () => calls.push(["renderJob"]),
      submitJobRequest: async () => {
        throw new Error("upload not found");
      },
      currentWorkflow: () => "book",
      workflowNeedsCredentials: () => false,
      workflowNeedsUpload: () => true,
      currentRenderSourceJobId: () => "",
      currentBudgetState: () => ({ visible: false, blocking: false, balanceChecked: true }),
      collectRunPayload: () => ({ workflow: "book", source: { upload_id: "upload-1" } }),
      validateBeforeSubmit: () => true,
      ensureOcrCredentialsReady: async () => true,
      hasBrowserCredentials: () => true,
      refreshDeepSeekBalance: async () => ({ status: "ok" }),
      startJobPolling: () => calls.push(["startPolling"]),
      libraryEventPort: {
        publishJobCreated: () => {},
        requestRefresh: () => {},
      },
    },
    uploadStatePort: {
      getSnapshot: () => ({ uploadId: "upload-1" }),
      setSubmitBusy: (busy) => calls.push(["uploadBusy", busy]),
      reset: (options) => calls.push(["uploadReset", options]),
    },
    runtimeEnvPort: {
      isDesktopConfigured: () => false,
      isDesktopMode: () => false,
    },
    jobSnapshotPort: {
      syncCurrentJobSnapshot: () => calls.push(["syncSnapshot"]),
    },
  });

  await feature.submitForm({ preventDefault() {} });

  assert.deepEqual(calls, [
    ["uploadBusy", true],
    ["busy", true],
    ["setText", "error-box", "-"],
    ["missingUpload", true],
    ["uploadReset", { includePageRange: false }],
    ["setText", "error-box", "reset through port"],
    ["uploadBusy", false],
    ["busy", false],
  ]);
});

test("app actions controller reads runtime env and job snapshot through ports", async () => {
  const calls = [];
  const feature = mountAppActionsFeature({
    state: {
      desktopMode: true,
      desktopConfigured: true,
      uploadId: "legacy-upload",
    },
    apiPrefix: "/api",
    buildApiEndpoint: () => "/health",
    setText: (id, text) => calls.push(["setText", id, text]),
    openDesktopOutputDirectory: async () => {},
    resetUploadedFile: () => {},
    configPort: createAppActionsConfigPort({
      resolveApiBase: () => "http://localhost",
      isMock: () => false,
    }),
    viewPort: createAppActionsViewPort({
      setSubmitBusyState: (busy) => calls.push(["busy", busy]),
      resetMissingUpload: () => {},
    }),
    uploadStatePort: {
      getSnapshot: () => ({ uploadId: "port-upload" }),
      setSubmitBusy: (busy) => calls.push(["uploadBusy", busy]),
    },
    runtimeEnvPort: {
      isDesktopConfigured: () => {
        calls.push(["desktopConfigured"]);
        return false;
      },
      isDesktopMode: () => {
        calls.push(["desktopMode"]);
        return false;
      },
    },
    jobSnapshotPort: {
      syncCurrentJobSnapshot: (payload, jobId, meta) => calls.push(["syncSnapshot", payload.job_id, jobId, meta.startedAt]),
    },
    submitFlow: {
      openSetupDialog: () => calls.push(["openSetupDialog"]),
      openBrowserCredentialsDialog: () => calls.push(["openCredentials"]),
      renderJob: (payload) => calls.push(["renderJob", payload.job_id]),
      submitJobRequest: async (_apiPrefix, payload) => {
        calls.push(["submitJobRequest", payload.source.upload_id]);
        return { job_id: "job-port", status: "running" };
      },
      currentWorkflow: () => "book",
      workflowNeedsCredentials: () => false,
      workflowNeedsUpload: () => true,
      currentRenderSourceJobId: () => "",
      currentBudgetState: () => ({ visible: false, blocking: false, balanceChecked: true }),
      collectRunPayload: () => ({ workflow: "book", source: { upload_id: "payload-upload" } }),
      validateBeforeSubmit: () => true,
      ensureOcrCredentialsReady: async () => true,
      hasBrowserCredentials: () => true,
      refreshDeepSeekBalance: async () => ({ status: "ok" }),
      startJobPolling: (jobId) => calls.push(["startPolling", jobId]),
      libraryEventPort: {
        publishJobCreated: (payload) => calls.push(["publish", payload.job_id]),
        requestRefresh: () => calls.push(["refresh"]),
      },
    },
  });

  await feature.submitForm({ preventDefault() {} });

  assert.equal(calls[0][0], "desktopMode");
  assert.deepEqual(calls.slice(1, 3), [
    ["uploadBusy", true],
    ["busy", true],
  ]);
  assert.ok(calls.some((call) => call[0] === "desktopConfigured"));
  assert.ok(calls.some((call) => call[0] === "submitJobRequest" && call[1] === "payload-upload"));
  assert.ok(calls.some((call) => call[0] === "publish" && call[1] === "job-port"));
  const syncCall = calls.find((call) => call[0] === "syncSnapshot");
  assert.equal(syncCall?.[1], "job-port");
  assert.equal(syncCall?.[2], "job-port");
  assert.match(syncCall?.[3] || "", /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(calls.some((call) => call[0] === "renderJob" && call[1] === "job-port"));
  assert.ok(calls.some((call) => call[0] === "startPolling" && call[1] === "job-port"));
  assert.deepEqual(calls.slice(-2), [
    ["uploadBusy", false],
    ["busy", false],
  ]);
});

test("mountAppActionsFeature accepts grouped submit flow dependencies", async () => {
  const previousDocument = global.document;
  const previousCustomEvent = global.CustomEvent;
  const events = [];
  global.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
  global.document = {
    dispatchEvent(event) {
      events.push(event.type);
    },
    getElementById() {
      return null;
    },
  };
  try {
    const { calls, options, state } = submitFlowHarness();
    state.uploadId = "upload-1";
    const feature = mountAppActionsFeature({
      state,
      configPort: createAppActionsConfigPort({
        resolveApiBase: () => "http://localhost",
        isMock: () => false,
      }),
      apiPrefix: "/api",
      buildApiEndpoint: () => "/health",
      setText: options.setText,
      openDesktopOutputDirectory: async () => {},
      resetUploadedFile: () => {},
      submitFlow: {
        openSetupDialog: options.openSetupDialog,
        openBrowserCredentialsDialog: options.openBrowserCredentialsDialog,
        renderJob: options.renderJob,
        submitJobRequest: options.submitJobRequest,
        currentWorkflow: () => "book",
        workflowNeedsCredentials,
        workflowNeedsUpload,
        currentRenderSourceJobId: options.currentRenderSourceJobId,
        currentBudgetState: options.currentBudgetState,
        collectRunPayload: options.collectRunPayload,
        validateBeforeSubmit: options.validateBeforeSubmit,
        ensureOcrCredentialsReady: options.ensureOcrCredentialsReady,
        hasBrowserCredentials: options.hasBrowserCredentials,
        refreshDeepSeekBalance: options.refreshDeepSeekBalance,
        startJobPolling: options.startJobPolling,
        libraryEventPort: options.libraryEventPort,
      },
    });

    await feature.submitForm({ preventDefault() {} });

    assert.equal(state.submitBusy, false);
    assert.equal(events.includes(APP_EVENTS.submitBusyChanged), true);
    assert.equal(calls.some((call) => call[0] === "submitJobRequest"), true);
    assert.equal(calls.some((call) => call[0] === "startPolling" && call[1] === "job-1"), true);
  } finally {
    global.document = previousDocument;
    global.CustomEvent = previousCustomEvent;
  }
});
