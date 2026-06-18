import test from "node:test";
import assert from "node:assert/strict";

import { bindMainEvents } from "../src/js/bootstrap/main-events.js";
import {
  createMainEventPort,
} from "../src/js/bootstrap/main-event-port.js";
import {
  createMainEventOverridePorts,
} from "../src/js/bootstrap/main-event-overrides-port.js";
import {
  createMainEventCredentialPersistencePort,
} from "../src/js/bootstrap/main-event-credential-persistence-port.js";
import {
  createMainEventBrowserConfigPersistencePort,
} from "../src/js/bootstrap/main-event-browser-config-persistence-port.js";
import {
  createMainEventHiddenCredentialPort,
} from "../src/js/bootstrap/main-event-hidden-credential-port.js";
import {
  createMainEventHiddenCredentialBindingPort,
} from "../src/js/bootstrap/main-event-hidden-credential-binding-port.js";
import {
  createMainEventDocumentPort,
} from "../src/js/bootstrap/main-event-document-port.js";
import {
  createMainEventDomPort,
} from "../src/js/bootstrap/main-event-dom-port.js";
import {
  createMainEventPrimaryActionsPort,
} from "../src/js/bootstrap/main-event-primary-actions-port.js";
import {
  APP_EVENTS,
  APP_SHELL_IDS,
} from "../src/js/contracts/app-contract.js";

function nextTick() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

test("main events bind DOM and document events through the event port", async () => {
  const calls = [];
  const elementHandlers = new Map();
  const documentHandlers = new Map();
  const eventPort = {
    bindElementEvent(id, eventName, handler) {
      calls.push(["element", id, eventName]);
      elementHandlers.set(`${id}:${eventName}`, handler);
    },
    bindDocumentEvent(eventName, handler) {
      calls.push(["document", eventName]);
      documentHandlers.set(eventName, handler);
    },
    bindHiddenCredentialPersistence() {
      calls.push(["credentials"]);
    },
    bindPrimaryActions(payload) {
      calls.push(["primary", Boolean(payload.state), Boolean(payload.fetchProtected), Boolean(payload.setTextFn)]);
    },
    dispatchDocumentEvent(eventName) {
      calls.push(["dispatch", eventName]);
    },
  };
  const featureCalls = [];
  const features = {
    developerFeature: { bindEvents: () => featureCalls.push("developer") },
    glossariesFeature: { bindEvents: () => featureCalls.push("glossaries") },
    homeFeature: { bindEvents: () => featureCalls.push("home") },
    artifactDownloadsFeature: { bindEvents: () => featureCalls.push("downloads") },
    statusDetailFeature: { bindEvents: () => featureCalls.push("status-detail") },
    appShellFeature: { bindChrome: () => featureCalls.push("shell") },
    workflowFeature: { refreshSubmitControls: () => featureCalls.push("refresh-submit") },
    uploadFeature: {
      handleFileSelected: () => featureCalls.push("file"),
      openPageRangeDialog: () => featureCalls.push("range-open"),
      applyPageRanges: () => featureCalls.push("range-apply"),
      clearPageRanges: () => featureCalls.push("range-clear"),
      constrainPageRanges: ({ source }) => featureCalls.push(`range-constrain:${source}`),
    },
    appActionsFeature: {
      submitForm: (event) => featureCalls.push(`submit:${event.type}`),
      handleOpenOutputDir: () => featureCalls.push("output"),
    },
    jobRuntimeFeature: {
      cancelCurrentJob: () => featureCalls.push("cancel"),
      returnToHome: () => featureCalls.push("home-return"),
      retryStage: (stage) => featureCalls.push(`retry:${stage}`),
    },
  };

  bindMainEvents({
    ...features,
    state: {},
    fetchProtected() {},
    setText() {},
    eventPort,
  });

  elementHandlers.get(`${APP_SHELL_IDS.fileInput}:change`)?.({ type: "change" });
  elementHandlers.get(`${APP_SHELL_IDS.credentialGateAction}:click`)?.({
    preventDefault: () => featureCalls.push("credential-prevented"),
  });
  elementHandlers.get(`${APP_SHELL_IDS.jobForm}:submit`)?.({ type: "submit" });
  elementHandlers.get(`${APP_SHELL_IDS.pageRangeButton}:click`)?.({});
  elementHandlers.get(`${APP_SHELL_IDS.pageRangeApplyButton}:click`)?.({});
  elementHandlers.get(`${APP_SHELL_IDS.pageRangeClearButton}:click`)?.({});
  elementHandlers.get(`${APP_SHELL_IDS.pageRangeStart}:input`)?.({});
  elementHandlers.get(`${APP_SHELL_IDS.pageRangeEnd}:input`)?.({});
  elementHandlers.get(`${APP_SHELL_IDS.cancelButton}:click`)?.({});
  documentHandlers.get(APP_EVENTS.returnHome)?.({});
  documentHandlers.get(APP_EVENTS.retryStage)?.({ detail: { stage: "render" } });
  elementHandlers.get(`${APP_SHELL_IDS.openOutputButton}:click`)?.({});
  await nextTick();

  assert.deepEqual(featureCalls, [
    "developer",
    "glossaries",
    "home",
    "downloads",
    "status-detail",
    "shell",
    "file",
    "credential-prevented",
    "submit:submit",
    "range-open",
    "range-apply",
    "range-clear",
    "range-constrain:start",
    "range-constrain:end",
    "cancel",
    "home-return",
    "retry:render",
    "output",
  ]);
  assert.equal(calls.some((call) => call[0] === "credentials"), true);
  assert.deepEqual(
    calls.filter((call) => call[0] === "dispatch"),
    [["dispatch", APP_EVENTS.openBrowserCredentials]],
  );
  assert.deepEqual(
    calls.filter((call) => call[0] === "primary"),
    [["primary", true, true, true]],
  );
});

test("main event port composes DOM document credential and primary action ports", () => {
  const calls = [];
  const element = {
    addEventListener: (eventName, handler) => calls.push(["element", eventName, handler.name]),
  };
  const documentRef = {
    addEventListener: (eventName, handler) => calls.push(["document", eventName, handler.name]),
    dispatchEvent: (event) => calls.push(["dispatch", event.type, event.detail?.stage]),
  };
  const domPort = createMainEventDomPort({
    byId: (id) => {
      calls.push(["by-id", id]);
      return element;
    },
  });
  const documentPort = createMainEventDocumentPort({
    CustomEventCtor: class TestCustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    documentRef,
  });
  const browserConfigPersistencePort = createMainEventBrowserConfigPersistencePort({
    saveBrowserConfig: () => "saved-browser-config",
  });
  const hiddenCredentialPort = createMainEventHiddenCredentialPort({
    bindCredentialPersistence: ({ saveBrowserStoredConfig }) => {
      calls.push(["credentials", saveBrowserStoredConfig()]);
    },
  });
  const hiddenCredentialBindingPort = createMainEventHiddenCredentialBindingPort({
    bindHiddenCredentialPersistence: ({ browserConfigPersistencePort: browserPort, hiddenCredentialPort: hiddenPort }) => {
      calls.push(["binding", browserPort.saveBrowserConfig()]);
      hiddenPort.bindCredentialPersistence({
        saveBrowserStoredConfig: browserPort.saveBrowserConfig,
      });
    },
  });
  const credentialPersistencePort = createMainEventCredentialPersistencePort({
    browserConfigPersistencePort,
    hiddenCredentialPort,
    hiddenCredentialBindingPort,
  });
  const primaryActionsPort = createMainEventPrimaryActionsPort({
    bindPrimaryActions: (payload) => calls.push(["primary", Boolean(payload.state)]),
  });
  const port = createMainEventPort({
    credentialPersistencePort,
    documentPort,
    domPort,
    primaryActionsPort,
  });
  const legacyOverridePort = createMainEventPort({
    byId: () => element,
    documentRef,
    bindCredentialPersistence: ({ saveBrowserStoredConfig }) => {
      calls.push(["legacy-credentials", saveBrowserStoredConfig()]);
    },
    saveBrowserConfig: () => "legacy-saved",
    bindPrimaryActions: () => calls.push(["legacy-primary"]),
    bindElementEvent: () => calls.push(["top-level-bind-element"]),
  });
  const explicitLeafWithTopLevelOverride = createMainEventPort({
    domPort,
    bindElementEvent: () => calls.push(["explicit-leaf-top-level-bind-element"]),
  });
  const explicitEmptyPort = createMainEventPort({
    domPort: {},
    byId: () => element,
  });
  const overridePorts = createMainEventOverridePorts({
    bindCredentialPersistence: undefined,
    bindPrimaryActions: () => {},
    documentRef,
    byId: null,
    saveBrowserConfig: () => "saved",
  });

  function onClick() {}
  function onReturn() {}

  assert.equal(port.domPort, domPort);
  assert.equal(port.documentPort, documentPort);
  assert.equal(port.credentialPersistencePort, credentialPersistencePort);
  assert.equal(credentialPersistencePort.browserConfigPersistencePort, browserConfigPersistencePort);
  assert.equal(credentialPersistencePort.hiddenCredentialPort, hiddenCredentialPort);
  assert.equal(credentialPersistencePort.hiddenCredentialBindingPort, hiddenCredentialBindingPort);
  assert.equal(port.primaryActionsPort, primaryActionsPort);
  assert.equal(explicitLeafWithTopLevelOverride.domPort, domPort);
  assert.equal(explicitEmptyPort.domPort.byId, undefined);
  assert.equal(typeof explicitEmptyPort.bindElementEvent, "function");
  assert.deepEqual(Object.keys(overridePorts.credentialPersistencePortOverrides), ["saveBrowserConfig"]);
  assert.deepEqual(Object.keys(overridePorts.domPortOverrides), ["byId"]);
  assert.equal(overridePorts.domPortOverrides.byId, null);
  assert.deepEqual(Object.keys(overridePorts.documentPortOverrides), ["documentRef"]);
  assert.deepEqual(Object.keys(overridePorts.primaryActionsPortOverrides), ["bindPrimaryActions"]);
  port.bindElementEvent("file", "change", onClick);
  port.bindDocumentEvent("return-home", onReturn);
  port.dispatchDocumentEvent("retry-stage", { stage: "render" });
  port.bindHiddenCredentialPersistence();
  port.bindPrimaryActions({ state: {} });
  legacyOverridePort.bindHiddenCredentialPersistence();
  legacyOverridePort.bindPrimaryActions({});
  legacyOverridePort.bindElementEvent();
  explicitLeafWithTopLevelOverride.bindElementEvent();

  assert.deepEqual(calls, [
    ["by-id", "file"],
    ["element", "change", "onClick"],
    ["document", "return-home", "onReturn"],
    ["dispatch", "retry-stage", "render"],
    ["binding", "saved-browser-config"],
    ["credentials", "saved-browser-config"],
    ["primary", true],
    ["legacy-credentials", "legacy-saved"],
    ["legacy-primary"],
    ["top-level-bind-element"],
    ["explicit-leaf-top-level-bind-element"],
  ]);
});
