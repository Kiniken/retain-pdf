import test from "node:test";
import assert from "node:assert/strict";

import {
  runDeepSeekBalanceCheck,
  runDeepSeekConnectivityCheck,
  runOcrTokenValidation,
} from "../src/js/features/credentials/validation.js";
import {
  handleBrowserDeepSeekValidate,
} from "../src/js/features/credentials/deepseek-flow.js";
import {
  createCredentialLegacyRuntimePort,
} from "../src/js/features/credentials/legacy-runtime-port.js";
import {
  createCredentialsPorts,
} from "../src/js/bootstrap/feature-credentials-ports.js";
import {
  createJobRuntimePorts,
} from "../src/js/bootstrap/feature-job-runtime-ports.js";
import {
  createWorkflowPorts,
} from "../src/js/bootstrap/feature-workflow-ports.js";
import {
  WORKFLOW_BOOK,
  WORKFLOW_RENDER,
} from "../src/js/bootstrap/workflow-constants.js";
import {
  createSubmitFlowPorts,
} from "../src/js/bootstrap/submit-flow-ports.js";
import {
  browserValidationIdForProvider,
  CREDENTIAL_DOM_DATASETS,
  CREDENTIAL_DOM_IDS,
  CREDENTIAL_DOM_SELECTORS,
} from "../src/js/features/credentials/credentials-dom-contract.js";
import { mountBrowserCredentialsFeature } from "../src/js/features/credentials/browser.js";
import { createBrowserCredentialViewPort } from "../src/js/features/credentials/browser-view-port.js";
import {
  createCredentialsStatePort,
  hasCompleteCredentials,
  ocrTokenFromCredentials,
} from "../src/js/features/credentials/state.js";
import {
  createCredentialRuntimeStatePort,
} from "../src/js/features/credentials/runtime-state-port.js";
import {
  applyHiddenCredentialInputs,
  readHiddenCredentialInputs,
  readHiddenCredentialDomInputs,
} from "../src/js/features/credentials/hidden-inputs.js";
import { createUploadStatePort } from "../src/js/features/upload/state.js";
import { createInitialState } from "../src/js/state/slices.js";

function createState() {
  return {
    credentials: {
      ocrValidation: {
        provider: "",
        token: "",
        status: "",
      },
    },
  };
}

test("runOcrTokenValidation passes injected apiPrefix to OCR validation port", async () => {
  const calls = [];
  const messages = [];
  const result = await runOcrTokenValidation({
    apiPrefix: "/custom/api",
    state: createState(),
    providerId: "paddle",
    token: "ocr-token",
    validateOcrToken: async (...args) => {
      calls.push(args);
      return { ok: true, status: "valid", summary: "ok" };
    },
    setOcrValidationMessage: (...args) => messages.push(args),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [["/custom/api", "paddle", "ocr-token"]]);
  assert.equal(messages.at(-1)[1], "valid");
});

test("runOcrTokenValidation mirrors OCR validation state through legacy runtime port", async () => {
  const calls = [];
  const result = await runOcrTokenValidation({
    apiPrefix: "/custom/api",
    providerId: "paddle",
    token: "ocr-token",
    validateOcrToken: async () => ({ ok: true, status: "valid", summary: "ok" }),
    setOcrValidationMessage() {},
    legacyRuntimePort: {
      resetOcrValidationCache: () => calls.push(["reset"]),
      setOcrValidationCache: (payload) => calls.push(["set", payload]),
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [[
    "set",
    {
      provider: "paddle",
      token: "ocr-token",
      status: "valid",
    },
  ]]);
});

test("runOcrTokenValidation does not call validation port without token", async () => {
  let called = false;
  const calls = [];
  const result = await runOcrTokenValidation({
    apiPrefix: "/custom/api",
    providerId: "paddle",
    token: "",
    validateOcrToken: async () => {
      called = true;
      return { ok: true };
    },
    setOcrValidationMessage() {},
    legacyRuntimePort: {
      resetOcrValidationCache: () => calls.push(["reset"]),
      setOcrValidationCache: (payload) => calls.push(["set", payload]),
    },
  });

  assert.equal(result.ok, false);
  assert.equal(called, false);
  assert.deepEqual(calls, [["reset"]]);
});

test("runDeepSeekConnectivityCheck passes injected apiPrefix to DeepSeek validation port", async () => {
  const calls = [];
  const result = await runDeepSeekConnectivityCheck({
    apiPrefix: "/custom/api",
    apiKey: "sk-test",
    baseUrl: "https://example.test/v1",
    validateDeepSeekToken: async (...args) => {
      calls.push(args);
      return { ok: true, status: 200, summary: "ok" };
    },
    setDeepSeekValidationMessage() {},
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [[
    "/custom/api",
    {
      api_key: "sk-test",
      base_url: "https://example.test/v1",
    },
  ]]);
});

test("runDeepSeekConnectivityCheck does not call validation port without API key", async () => {
  let called = false;
  const result = await runDeepSeekConnectivityCheck({
    apiPrefix: "/custom/api",
    apiKey: "",
    baseUrl: "https://example.test/v1",
    validateDeepSeekToken: async () => {
      called = true;
      return { ok: true };
    },
    setDeepSeekValidationMessage() {},
  });

  assert.equal(result.ok, false);
  assert.equal(called, false);
});

test("runDeepSeekBalanceCheck passes injected apiPrefix to balance port", async () => {
  const calls = [];
  const result = await runDeepSeekBalanceCheck({
    apiPrefix: "/custom/api",
    apiKey: "sk-test",
    baseUrl: "https://example.test/v1",
    queryDeepSeekBalance: async (...args) => {
      calls.push(args);
      return { ok: true, is_available: true };
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [[
    "/custom/api",
    {
      api_key: "sk-test",
      base_url: "https://example.test/v1",
    },
  ]]);
});

test("handleBrowserDeepSeekValidate mirrors balance through legacy runtime port", async () => {
  const calls = [];
  const messages = [];
  const result = await handleBrowserDeepSeekValidate({
    apiPrefix: "/custom/api",
    defaultModelApiKey: () => "sk-test",
    validateDeepSeekToken: async () => ({ ok: true, status: 200 }),
    queryDeepSeekBalance: async () => ({
      ok: true,
      is_available: true,
      balance_infos: [
        { currency: "CNY", total_balance: "3.25" },
      ],
    }),
    onBalanceChange: () => calls.push(["balance-change"]),
    credentialsStatePort: {
      getCredentials: () => ({ modelApiKey: "sk-test" }),
      resetDeepSeekBalance: () => calls.push(["state-reset"]),
      setDeepSeekBalance: (balanceCny, checked) => calls.push(["state-set", balanceCny, checked]),
    },
    legacyRuntimePort: {
      resetDeepSeekBalance: () => calls.push(["legacy-reset"]),
      setDeepSeekBalance: (balanceCny, checked) => calls.push(["legacy-set", balanceCny, checked]),
    },
    viewPort: {
      elements: () => ({
        apiKeyInput: createCredentialNode({ value: "" }),
        modelBaseUrlInput: createCredentialNode({ value: "" }),
      }),
      setTopUpVisible: (visible) => calls.push(["top-up", visible]),
      setValidationMessage: (message, tone) => messages.push([message, tone]),
    },
  });

  assert.equal(result.ok, true);
  assert.ok(calls.some((call) => call[0] === "legacy-reset"));
  assert.ok(calls.some((call) => call[0] === "legacy-set" && call[1] === 3.25 && call[2] === true));
  assert.ok(calls.some((call) => call[0] === "state-set" && call[1] === 3.25 && call[2] === true));
  assert.deepEqual(messages.at(-1), ["DeepSeek 可用，余额 CNY 3.25", "valid"]);
});

test("credentials DOM contract centralizes hidden inputs and browser dialog ids", () => {
  assert.equal(CREDENTIAL_DOM_IDS.hidden.ocrProvider, "ocr_provider");
  assert.equal(CREDENTIAL_DOM_IDS.hidden.modelApiKey, "api_key");
  assert.equal(CREDENTIAL_DOM_IDS.browser.ocrProviderSelect, "browser-ocr-provider-select");
  assert.equal(CREDENTIAL_DOM_IDS.browser.validations.deepseek, "browser-deepseek-validation");
  assert.equal(browserValidationIdForProvider("paddle"), CREDENTIAL_DOM_IDS.browser.validations.paddle);
  assert.equal(browserValidationIdForProvider("mineru"), CREDENTIAL_DOM_IDS.browser.validations.mineru);
  assert.equal(CREDENTIAL_DOM_DATASETS.credentialTab, "credentialTab");
  assert.equal(CREDENTIAL_DOM_SELECTORS.trigger, "#credentials-btn, #credential-gate-action");
});

test("credentials state port owns credential source of truth and token helpers", () => {
  const mirrored = [];
  const port = createCredentialsStatePort({
    initialState: {
      ocrProvider: "paddle",
      paddleToken: "paddle-token",
      mineruToken: "mineru-token",
      modelApiKey: "sk-test",
    },
    mirrorToDom: (snapshot) => mirrored.push(snapshot),
  });

  assert.equal(port.getOcrToken({ providerId: "paddle" }), "paddle-token");
  assert.equal(port.getOcrToken({ providerId: "unknown-provider" }), "paddle-token");
  assert.equal(port.hasComplete(), true);
  assert.equal(ocrTokenFromCredentials({ ocrProvider: "paddle" }, {
    defaultPaddleToken: () => "paddle-default",
  }), "paddle-default");
  assert.equal(hasCompleteCredentials({ ocrProvider: "paddle", modelApiKey: "sk" }, {
    defaultPaddleToken: () => "paddle-default",
  }), true);

  port.patchCredentials({ ocrProvider: "bad-provider", paddleToken: "" });

  assert.equal(port.getCredentials().ocrProvider, "paddle");
  assert.equal(port.getCredentials().paddleToken, "");
  assert.equal(mirrored.length, 1);
});

test("credentials state port owns validation and balance runtime state", () => {
  const mirroredRuntime = [];
  const port = createCredentialsStatePort({
    initialState: {
      ocrProvider: "paddle",
      paddleToken: "paddle-token",
      modelApiKey: "sk-test",
    },
    mirrorRuntime: (snapshot) => mirroredRuntime.push(snapshot),
  });

  assert.deepEqual(port.getDeepSeekBalanceState(), {
    balanceCny: null,
    balanceChecked: false,
  });

  port.setDeepSeekBalance("3.5", true);
  assert.deepEqual(port.getDeepSeekBalanceState(), {
    balanceCny: 3.5,
    balanceChecked: true,
  });

  port.setOcrValidationCache({
    provider: "paddle",
    token: "paddle-token",
    status: "valid",
  });

  assert.equal(port.hasValidOcrValidationCache({
    provider: "paddle",
    token: "paddle-token",
  }), true);

  port.resetDeepSeekBalance();
  port.resetOcrValidationCache();

  assert.deepEqual(port.getDeepSeekBalanceState(), {
    balanceCny: null,
    balanceChecked: false,
  });
  assert.equal(port.hasValidOcrValidationCache({
    provider: "paddle",
    token: "paddle-token",
  }), false);
  assert.equal(mirroredRuntime.length, 4);
});

test("credentials runtime state port owns legacy mirror side effects", () => {
  const calls = [];
  const port = createCredentialRuntimeStatePort({
    mirrorRuntime: (runtime) => calls.push(runtime),
  });

  port.mirrorRuntime({
    deepseekBalanceCny: 1.5,
    deepseekBalanceChecked: true,
    ocrValidation: {
      provider: "paddle",
      token: "token",
      status: "valid",
    },
  });

  assert.deepEqual(calls, [{
    deepseekBalanceCny: 1.5,
    deepseekBalanceChecked: true,
    ocrValidation: {
      provider: "paddle",
      token: "token",
      status: "valid",
    },
  }]);
});

test("credentials runtime state port mirrors through narrow credential state slice", () => {
  const legacyState = createInitialState();
  const port = createCredentialRuntimeStatePort();

  port.mirrorRuntime({
    deepseekBalanceCny: "2.75",
    deepseekBalanceChecked: true,
    ocrValidation: {
      provider: "paddle",
      token: "ocr-token",
      status: "valid",
    },
  }, legacyState);

  assert.equal(legacyState.deepseekBalanceCny, 2.75);
  assert.equal(legacyState.deepseekBalanceChecked, true);
  assert.equal(legacyState.validatedOcrProvider, "paddle");
  assert.equal(legacyState.validatedOcrToken, "ocr-token");
  assert.equal(legacyState.ocrValidationStatus, "valid");

  port.mirrorRuntime({
    deepseekBalanceChecked: false,
    ocrValidation: {},
  }, legacyState);

  assert.equal(legacyState.deepseekBalanceCny, null);
  assert.equal(legacyState.deepseekBalanceChecked, false);
  assert.equal(legacyState.validatedOcrProvider, "");
  assert.equal(legacyState.validatedOcrToken, "");
  assert.equal(legacyState.ocrValidationStatus, "");
});

test("credentials runtime state port has no implicit global legacy state fallback", () => {
  const port = createCredentialRuntimeStatePort();

  assert.doesNotThrow(() => {
    port.mirrorRuntime({
      deepseekBalanceCny: "2.75",
      deepseekBalanceChecked: true,
      ocrValidation: {
        provider: "paddle",
        token: "ocr-token",
        status: "valid",
      },
    });
  });
});

test("credentials legacy runtime port mirrors through narrow credential state slice", () => {
  const legacyState = createInitialState();
  const port = createCredentialLegacyRuntimePort(legacyState);

  port.setDeepSeekBalance("4.5", true);
  port.setOcrValidationCache({
    provider: "paddle",
    token: "ocr-token",
    status: "valid",
  });

  assert.equal(legacyState.deepseekBalanceCny, 4.5);
  assert.equal(legacyState.deepseekBalanceChecked, true);
  assert.equal(legacyState.validatedOcrProvider, "paddle");
  assert.equal(legacyState.validatedOcrToken, "ocr-token");
  assert.equal(legacyState.ocrValidationStatus, "valid");

  port.resetDeepSeekBalance();
  port.resetOcrValidationCache();

  assert.equal(legacyState.deepseekBalanceCny, null);
  assert.equal(legacyState.deepseekBalanceChecked, false);
  assert.equal(legacyState.validatedOcrProvider, "");
  assert.equal(legacyState.validatedOcrToken, "");
  assert.equal(legacyState.ocrValidationStatus, "");
});

test("hidden credential inputs mirror through the default credentials port", () => {
  const previousDocument = global.document;
  const elements = new Map([
    [CREDENTIAL_DOM_IDS.hidden.ocrProvider, createCredentialNode({ value: "" })],
    [CREDENTIAL_DOM_IDS.hidden.mineruToken, createCredentialNode({ value: "" })],
    [CREDENTIAL_DOM_IDS.hidden.paddleToken, createCredentialNode({ value: "" })],
    [CREDENTIAL_DOM_IDS.hidden.modelApiKey, createCredentialNode({ value: "" })],
  ]);
  global.document = {
    getElementById(id) {
      return elements.get(id) || null;
    },
  };

  try {
    applyHiddenCredentialInputs({
      ocrProvider: "paddle",
      paddleToken: "paddle-token",
      mineruToken: "mineru-token",
      modelApiKey: "sk-test",
    });

    assert.deepEqual(readHiddenCredentialInputs(), {
      ocrProvider: "paddle",
      mineruToken: "mineru-token",
      paddleToken: "paddle-token",
      modelApiKey: "sk-test",
    });
    assert.deepEqual(readHiddenCredentialDomInputs(), {
      ocrProvider: "paddle",
      mineruToken: "mineru-token",
      paddleToken: "paddle-token",
      modelApiKey: "sk-test",
    });
  } finally {
    global.document = previousDocument;
  }
});

test("credentials feature port exposes narrow capabilities", async () => {
  const calls = [];
  const feature = {
    hasBrowserCredentials: () => true,
    openBrowserCredentialsDialog: (options) => calls.push(["open", options]),
    refreshDeepSeekBalance: async (options) => {
      calls.push(["balance", options]);
      return { status: "ok" };
    },
    ensureOcrCredentialsReady: async (options) => {
      calls.push(["ocr", Object.keys(options || {})]);
      return true;
    },
    updateCredentialGate: (options) => calls.push(["gate", Boolean(options?.refreshSubmitControls)]),
  };
  const ports = createCredentialsPorts({ browserCredentialsFeature: feature });

  assert.equal(ports.hasBrowserCredentials(), true);
  ports.openBrowserCredentialsDialog({ focus: "ocr" });
  assert.deepEqual(await ports.refreshDeepSeekBalance({ silent: true }), { status: "ok" });
  assert.equal(await ports.ensureOcrCredentialsReady({ onMissingToken() {} }), true);
  ports.updateCredentialGate({ refreshSubmitControls() {} });

  assert.deepEqual(calls, [
    ["open", { focus: "ocr" }],
    ["balance", { silent: true }],
    ["ocr", ["onMissingToken"]],
    ["gate", true],
  ]);
});

function createClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    toggle(name, force) {
      if (force === undefined ? !values.has(name) : force) {
        values.add(name);
      } else {
        values.delete(name);
      }
    },
    contains: (name) => values.has(name),
  };
}

function createCredentialNode(overrides = {}) {
  return {
    classList: createClassList(),
    dataset: {},
    hidden: false,
    value: "",
    textContent: "",
    title: "",
    addEventListener() {},
    closest() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    ...overrides,
  };
}

test("browser credential gate reads upload readiness from upload state port", () => {
  const previousDocument = global.document;
  const state = createInitialState();
  const uploadStatePort = createUploadStatePort(state);
  uploadStatePort.setUpload({
    uploadId: "upload-ready",
    uploadedFileName: "book.pdf",
    uploadedPageCount: 12,
    uploadedBytes: 1024,
  });

  const tileCalls = [];
  const elements = new Map([
    [CREDENTIAL_DOM_IDS.trigger, createCredentialNode()],
    [CREDENTIAL_DOM_IDS.gate, createCredentialNode()],
    [CREDENTIAL_DOM_IDS.file, createCredentialNode({
      closest(selector) {
        return selector === ".upload-tile" ? createCredentialNode() : null;
      },
    })],
    ["upload-glyph", createCredentialNode()],
    ["file-label", createCredentialNode()],
    ["upload-help", createCredentialNode()],
    ["upload-status", createCredentialNode()],
  ]);

  global.document = {
    addEventListener() {},
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector(selector) {
      return selector === ".upload-meta" ? createCredentialNode() : null;
    },
  };

  try {
    const feature = mountBrowserCredentialsFeature({
      apiPrefix: "api/v1",
      state,
      uploadStatePort,
      applyHiddenCredentialInputs() {},
      defaultMineruToken: () => "",
      defaultPaddleToken: () => "",
      defaultModelApiKey: () => "",
      defaultModelBaseUrl: () => "",
      getTaskOptions: () => ({}),
      saveTaskOptions() {},
      saveBrowserStoredConfig() {},
      readHiddenCredentialInputs: () => ({
        ocrProvider: "paddle",
        mineruToken: "mineru",
        paddleToken: "paddle",
        modelApiKey: "sk",
      }),
      saveDesktopConfig() {},
      checkApiConnectivity: async () => true,
      validateOcrToken: async () => ({ ok: true }),
      validateDeepSeekToken: async () => ({ ok: true }),
      queryDeepSeekBalance: async () => ({ ok: true, balance_cny: 100 }),
      onCredentialStateChange() {},
      viewPort: createBrowserCredentialViewPort({
        uploadTilePort: {
          setUploadTileLocked: (payload) => tileCalls.push(["locked", payload]),
          setUploadTileReady: (ready) => tileCalls.push(["ready", ready]),
          setUploadTileText: (payload) => tileCalls.push(["text", payload]),
        },
      }),
    });

    feature.updateCredentialGate({
      workflowNeedsCredentials: () => false,
      workflowNeedsUpload: () => true,
      refreshSubmitControls() {},
    });

    assert.deepEqual(tileCalls.at(-1), ["ready", true]);
  } finally {
    global.document = previousDocument;
  }
});

test("browser credentials controller routes UI operations through view port", () => {
  const calls = [];
  const state = createInitialState();
  const uploadStatePort = createUploadStatePort(state);
  const credentialsStatePort = createCredentialsStatePort({
    initialState: {
      ocrProvider: "paddle",
      paddleToken: "paddle-token",
      mineruToken: "mineru-token",
      modelApiKey: "sk-test",
    },
  });
  let boundHandlers = null;
  const feature = mountBrowserCredentialsFeature({
      apiPrefix: "api/v1",
      state,
      uploadStatePort,
      credentialsStatePort,
      applyHiddenCredentialInputs() {},
      defaultMineruToken: () => "",
      defaultPaddleToken: () => "",
      defaultModelApiKey: () => "",
      defaultModelBaseUrl: () => "",
      getTaskOptions: () => ({}),
      saveTaskOptions() {},
      saveBrowserStoredConfig() {},
      readHiddenCredentialInputs: () => credentialsStatePort.getCredentials(),
      saveDesktopConfig() {},
      checkApiConnectivity: async () => true,
      validateOcrToken: async () => ({ ok: true }),
      validateDeepSeekToken: async () => ({ ok: true }),
      queryDeepSeekBalance: async () => ({ ok: true, balance_cny: 100 }),
      onCredentialStateChange() {},
      viewPort: {
        activateTab: (tabName) => calls.push(["tab", tabName]),
        bindEvents: (handlers) => {
          boundHandlers = handlers;
          calls.push(["bind"]);
        },
        closeDialog: () => calls.push(["close"]),
        dialogElements: () => ({ dialog: {} }),
        openDialog: () => calls.push(["open"]),
        setDeepSeekTopUpVisible: (visible) => calls.push(["top-up", visible]),
        setDeepSeekValidationMessage: (message, tone) => calls.push(["deepseek-message", message, tone]),
        setDialogMode: ({ setupMode }) => calls.push(["mode", setupMode]),
        setDialogStatus: (message, tone) => calls.push(["status", message, tone]),
        setHiddenOcrProvider: (provider) => calls.push(["hidden-provider", provider]),
        setOcrValidationMessage: (message, tone, provider) => calls.push(["ocr-message", message, tone, provider]),
        syncOcrProviderControls: (provider) => calls.push(["controls", provider]),
        updateCredentialGate: (payload) => {
          calls.push(["gate", payload.show, payload.uploadReady]);
          return true;
        },
      },
      dialogElementsPort: {
        elements: () => ({
          mineruInput: createCredentialNode(),
          paddleInput: createCredentialNode(),
          apiKeyInput: createCredentialNode(),
          modelBaseUrlInput: createCredentialNode(),
          modelNameInput: createCredentialNode(),
          mathModeSelect: createCredentialNode(),
        }),
        syncOcrProviderControls: (provider) => calls.push(["sync-dialog-controls", provider]),
      },
    });

  feature.openBrowserCredentialsDialog({ setupMode: true });
  feature.updateCredentialGate({
    workflowNeedsCredentials: () => true,
    workflowNeedsUpload: () => true,
    refreshSubmitControls: () => calls.push(["refresh-submit"]),
  });
  boundHandlers.changeProvider({ currentTarget: { value: "mineru" } });

  assert.equal(calls.some(([kind]) => kind === "bind"), true);
  assert.equal(calls.some(([kind]) => kind === "open"), true);
  assert.equal(calls.some(([kind, setupMode]) => kind === "mode" && setupMode === true), true);
  assert.equal(calls.some(([kind]) => kind === "gate"), true);
  assert.equal(calls.some(([kind]) => kind === "refresh-submit"), true);
  assert.equal(calls.some(([kind]) => kind === "sync-dialog-controls"), true);
  const hiddenProvider = calls.find(([kind]) => kind === "hidden-provider")?.[1] || "";
  const controlsProvider = calls.find(([kind]) => kind === "controls")?.[1] || "";
  assert.equal(Boolean(hiddenProvider), true);
  assert.equal(controlsProvider, hiddenProvider);
});

test("browser credentials controller reads runtime and balance state through ports", async () => {
  const calls = [];
  const credentialsStatePort = createCredentialsStatePort({
    initialState: {
      ocrProvider: "paddle",
      paddleToken: "paddle-token",
      mineruToken: "mineru-token",
      modelApiKey: "sk-test",
    },
  });
  let boundHandlers = null;
  const feature = mountBrowserCredentialsFeature({
    apiPrefix: "api/v1",
    state: {
      desktopMode: true,
      uploadId: "",
    },
    uploadStatePort: {
      getSnapshot: () => {
        calls.push(["upload-snapshot"]);
        return { uploadId: "port-upload" };
      },
    },
    runtimeEnvPort: {
      isDesktopMode: () => {
        calls.push(["desktop-mode"]);
        return false;
      },
    },
    balanceStatePort: {
      resetDeepSeekBalance: () => calls.push(["balance-reset"]),
    },
    credentialsStatePort,
    applyHiddenCredentialInputs() {},
    defaultMineruToken: () => "",
    defaultPaddleToken: () => "",
    defaultModelApiKey: () => "",
    defaultModelBaseUrl: () => "",
    getTaskOptions: () => ({}),
    saveTaskOptions() {},
    saveBrowserStoredConfig() {},
    readHiddenCredentialInputs: () => credentialsStatePort.getCredentials(),
    saveDesktopConfig() {},
    checkApiConnectivity: async () => true,
    validateOcrToken: async () => ({ ok: true, status: "valid", summary: "ok" }),
    validateDeepSeekToken: async () => ({ ok: true }),
    queryDeepSeekBalance: async () => ({ ok: true, balance_cny: 100 }),
    onCredentialStateChange: () => calls.push(["credential-change"]),
    viewPort: {
      activateTab: (tabName) => calls.push(["tab", tabName]),
      bindEvents: (handlers) => {
        boundHandlers = handlers;
      },
      closeDialog: () => calls.push(["close"]),
      dialogElements: () => ({ dialog: { dataset: {} } }),
      openDialog: () => calls.push(["open"]),
      setDeepSeekTopUpVisible: (visible) => calls.push(["top-up", visible]),
      setDeepSeekValidationMessage: (message, tone) => calls.push(["deepseek-message", message, tone]),
      setDialogMode: ({ setupMode }) => calls.push(["mode", setupMode]),
      setDialogStatus: (message, tone) => calls.push(["status", message, tone]),
      setHiddenOcrProvider: () => {},
      setOcrValidationMessage: (message, tone, provider) => calls.push(["ocr-message", message, tone, provider]),
      syncOcrProviderControls: () => {},
      updateCredentialGate: (payload) => {
        calls.push(["gate", payload.desktopMode, payload.uploadReady]);
        return true;
      },
    },
    dialogElementsPort: {
      elements: () => ({
        mineruInput: createCredentialNode(),
        paddleInput: createCredentialNode({ value: "paddle-token" }),
        apiKeyInput: createCredentialNode({ value: "sk-test" }),
        modelBaseUrlInput: createCredentialNode(),
        modelNameInput: createCredentialNode(),
        mathModeSelect: createCredentialNode(),
      }),
      syncOcrProviderControls: () => {},
    },
  });

  feature.openBrowserCredentialsDialog();
  feature.updateCredentialGate({
    workflowNeedsCredentials: () => true,
    workflowNeedsUpload: () => true,
    refreshSubmitControls: () => calls.push(["refresh-submit"]),
  });
  await feature.ensureOcrCredentialsReady();
  boundHandlers.resetDeepSeekValidation();

  assert.ok(calls.some((call) => call[0] === "balance-reset"));
  assert.ok(calls.some((call) => call[0] === "upload-snapshot"));
  assert.ok(calls.some((call) => call[0] === "desktop-mode"));
  assert.ok(calls.some((call) => call[0] === "gate" && call[1] === false && call[2] === true));
  assert.ok(calls.some((call) => call[0] === "credential-change"));
});

test("submit flow ports group workflow upload credentials runtime and library capabilities", () => {
  const workflowPorts = {
    currentWorkflow: () => "book",
    workflowNeedsCredentials: () => true,
    workflowNeedsUpload: () => true,
    currentRenderSourceJobId: () => "",
    currentBudgetState: () => ({ visible: false }),
    collectRunPayload: () => ({ workflow: "book" }),
  };
  const uploadPorts = {
    validatePageRanges: () => true,
  };
  const credentialsPorts = {
    ensureOcrCredentialsReady: async () => true,
    hasBrowserCredentials: () => true,
    openBrowserCredentialsDialog: () => {},
    refreshDeepSeekBalance: async () => ({ status: "ok" }),
  };
  const jobRuntimePorts = {
    startJobPolling: () => {},
  };
  const libraryEventPort = {};
  const openSetupDialog = () => {};
  const renderJob = () => {};
  const submitJobRequest = async () => ({ job_id: "job-1" });

  const ports = createSubmitFlowPorts({
    workflowPorts,
    uploadPorts,
    credentialsPorts,
    jobRuntimePorts,
    libraryEventPort,
    openSetupDialog,
    renderJob,
    submitJobRequest,
  });

  assert.equal(ports.currentWorkflow, workflowPorts.currentWorkflow);
  assert.equal(ports.workflowNeedsCredentials, workflowPorts.workflowNeedsCredentials);
  assert.equal(ports.workflowNeedsUpload, workflowPorts.workflowNeedsUpload);
  assert.equal(ports.currentRenderSourceJobId, workflowPorts.currentRenderSourceJobId);
  assert.equal(ports.currentBudgetState, workflowPorts.currentBudgetState);
  assert.equal(ports.collectRunPayload, workflowPorts.collectRunPayload);
  assert.equal(ports.validateBeforeSubmit, uploadPorts.validatePageRanges);
  assert.equal(ports.ensureOcrCredentialsReady, credentialsPorts.ensureOcrCredentialsReady);
  assert.equal(ports.hasBrowserCredentials, credentialsPorts.hasBrowserCredentials);
  assert.equal(ports.openBrowserCredentialsDialog, credentialsPorts.openBrowserCredentialsDialog);
  assert.equal(ports.refreshDeepSeekBalance, credentialsPorts.refreshDeepSeekBalance);
  assert.equal(ports.startJobPolling, jobRuntimePorts.startJobPolling);
  assert.equal(ports.libraryEventPort, libraryEventPort);
  assert.equal(ports.openSetupDialog, openSetupDialog);
  assert.equal(ports.renderJob, renderJob);
  assert.equal(ports.submitJobRequest, submitJobRequest);
});

test("job runtime port exposes start polling without leaking the runtime feature", () => {
  const calls = [];
  const ports = createJobRuntimePorts({
    jobRuntimeFeature: {
      startPolling: (jobId) => calls.push(jobId),
    },
  });

  ports.startJobPolling("job-1");

  assert.deepEqual(calls, ["job-1"]);
});

test("workflow feature ports preserve legacy defaults and false passthrough", () => {
  const defaultPorts = createWorkflowPorts({});
  const falsePorts = createWorkflowPorts({
    workflowFeature: {
      workflowNeedsCredentials: () => false,
      workflowNeedsUpload: () => false,
    },
  });

  assert.equal(defaultPorts.currentWorkflow(), WORKFLOW_BOOK);
  assert.equal(defaultPorts.workflowNeedsCredentials(WORKFLOW_BOOK), true);
  assert.equal(defaultPorts.workflowNeedsUpload(WORKFLOW_BOOK), true);
  assert.equal(defaultPorts.workflowNeedsCredentials(WORKFLOW_RENDER), false);
  assert.equal(defaultPorts.workflowNeedsUpload(WORKFLOW_RENDER), false);
  assert.equal(defaultPorts.workflowNeedsCredentials(), true);
  assert.equal(defaultPorts.workflowNeedsUpload(), true);
  assert.equal(falsePorts.workflowNeedsCredentials(WORKFLOW_BOOK), false);
  assert.equal(falsePorts.workflowNeedsUpload(WORKFLOW_BOOK), false);
});
