import test from "node:test";
import assert from "node:assert/strict";

import {
  createUploadWorkflowMountPorts,
} from "../src/js/bootstrap/upload-workflow-mount-ports.js";
import {
  buildDeveloperFeatureMountPayload,
  buildUploadFeatureMountPayload,
  buildWorkflowFeatureMountPayload,
} from "../src/js/bootstrap/upload-workflow-feature-mount-payloads.js";
import {
  mountUploadWorkflowFeatures,
} from "../src/js/bootstrap/mount-upload-workflow-features.js";
import {
  createUploadWorkflowFeatureControllersPort,
} from "../src/js/bootstrap/upload-workflow-feature-controllers-port.js";
import {
  createUploadDeveloperFeatureControllerPort,
} from "../src/js/bootstrap/upload-developer-feature-controller-port.js";
import {
  createUploadFeatureControllerPort,
} from "../src/js/bootstrap/upload-feature-controller-port.js";
import {
  createUploadFormDataPort,
} from "../src/js/bootstrap/upload-form-data-port.js";
import {
  createWorkflowFeatureControllerPort,
} from "../src/js/bootstrap/workflow-feature-controller-port.js";
import {
  createUploadWorkflowCredentialsStatePort,
} from "../src/js/bootstrap/upload-workflow-credentials-state-port.js";
import {
  createUploadRuntimeMountPort,
} from "../src/js/bootstrap/upload-runtime-mount-port.js";
import {
  createUploadRuntimeConfigPort,
} from "../src/js/bootstrap/upload-runtime-config-port.js";
import {
  createUploadRuntimeDefaultsPort,
} from "../src/js/bootstrap/upload-runtime-defaults-port.js";
import {
  createUploadRuntimeDataPort,
} from "../src/js/bootstrap/upload-runtime-data-port.js";
import {
  createUploadRuntimeHttpPort,
} from "../src/js/bootstrap/upload-runtime-http-port.js";
import {
  createUploadRuntimePdfPort,
} from "../src/js/bootstrap/upload-runtime-pdf-port.js";
import {
  createUploadRuntimeLegacyStatePort,
} from "../src/js/bootstrap/upload-runtime-legacy-state-port.js";
import {
  createUploadRuntimeStatePort,
} from "../src/js/bootstrap/upload-runtime-state-port.js";
import {
  createUploadRuntimeUiPort,
} from "../src/js/bootstrap/upload-runtime-ui-port.js";
import {
  createUploadRuntimeJobActionsPort,
} from "../src/js/bootstrap/upload-runtime-job-actions-port.js";
import {
  createWorkflowConfigMountPort,
} from "../src/js/bootstrap/workflow-config-mount-port.js";
import {
  createWorkflowConfigDefaultsPort,
} from "../src/js/bootstrap/workflow-config-defaults-port.js";
import {
  createWorkflowConfigModelDefaultsPort,
} from "../src/js/bootstrap/workflow-config-model-defaults-port.js";
import {
  createWorkflowConfigOcrDefaultsPort,
} from "../src/js/bootstrap/workflow-config-ocr-defaults-port.js";
import {
  createWorkflowConfigRuntimePort,
} from "../src/js/bootstrap/workflow-config-runtime-port.js";
import {
  createWorkflowConfigConstantRuntimePort,
} from "../src/js/bootstrap/workflow-config-constant-runtime-port.js";
import {
  createWorkflowConfigDesktopRuntimePort,
} from "../src/js/bootstrap/workflow-config-desktop-runtime-port.js";
import {
  createWorkflowConfigFeatureRuntimePort,
} from "../src/js/bootstrap/workflow-config-feature-runtime-port.js";
import {
  createWorkflowConfigNormalizerRuntimePort,
} from "../src/js/bootstrap/workflow-config-normalizer-runtime-port.js";
import {
  createWorkflowConfigStatePort,
} from "../src/js/bootstrap/workflow-config-state-port.js";
import {
  createWorkflowConfigDeveloperStatePort,
} from "../src/js/bootstrap/workflow-config-developer-state-port.js";
import {
  createWorkflowConfigPersistencePort,
} from "../src/js/bootstrap/workflow-config-persistence-port.js";
import {
  createWorkflowGlossaryMountPort,
} from "../src/js/bootstrap/workflow-glossary-mount-port.js";
import {
  createWorkflowGlossaryDataPort,
} from "../src/js/bootstrap/workflow-glossary-data-port.js";
import {
  createWorkflowGlossaryRuntimePort,
} from "../src/js/bootstrap/workflow-glossary-runtime-port.js";
import {
  createWorkflowGlossaryRuntimeConfigPort,
} from "../src/js/bootstrap/workflow-glossary-runtime-config-port.js";
import {
  createWorkflowGlossaryUiPort,
} from "../src/js/bootstrap/workflow-glossary-ui-port.js";
import {
  createUploadTileUiPort,
} from "../src/js/bootstrap/upload-tile-ui-port.js";
import {
  createWorkflowViewMountPort,
} from "../src/js/bootstrap/workflow-view-mount-port.js";

test("upload workflow mount ports can be overridden as one bootstrap dependency group", () => {
  const override = {
    apiBase: "http://api.test",
    apiPrefix: "/custom/api",
    state: { marker: true },
    frontMaxPageCount: 123,
    setText: () => {},
    submitUploadRequest: async () => ({}),
  };
  const ports = createUploadWorkflowMountPorts(override);

  assert.equal(ports.apiBase, "http://api.test");
  assert.equal(ports.apiPrefix, "/custom/api");
  assert.deepEqual(ports.state, { marker: true });
  assert.equal(ports.frontMaxPageCount, 123);
  assert.equal(ports.setText, override.setText);
  assert.equal(ports.submitUploadRequest, override.submitUploadRequest);
  assert.equal(typeof ports.createUploadStatePort, "function");
  assert.equal(typeof ports.workflowConfigPort, "object");
});

test("upload workflow mount ports expose grouped upload workflow and glossary ports", () => {
  const developerControllerPort = createUploadDeveloperFeatureControllerPort({
    mountDeveloperFeature: () => ({ name: "developer" }),
  });
  const uploadControllerPort = createUploadFeatureControllerPort({
    mountUploadFeature: () => ({ name: "upload" }),
  });
  const uploadFormDataPort = createUploadFormDataPort({
    collectUploadFormData: () => ({ file: "upload.pdf" }),
  });
  const workflowControllerPort = createWorkflowFeatureControllerPort({
    mountWorkflowFeature: () => ({ name: "workflow" }),
  });
  const featureControllersPort = createUploadWorkflowFeatureControllersPort({
    developerControllerPort,
    uploadControllerPort,
    uploadFormDataPort,
    workflowControllerPort,
  });
  const credentialsStatePort = { readCredentials: () => ({ modelApiKey: "sk-upload" }) };
  const credentialsStateMountPort = createUploadWorkflowCredentialsStatePort({
    credentialsStatePort,
  });
  const uploadRuntimePort = createUploadRuntimeMountPort({
    apiBase: "http://upload.test",
    frontMaxPageCount: 321,
  });
  const workflowConfigRuntimePort = createWorkflowConfigMountPort({
    defaultModelName: () => "model-from-group",
  });
  const workflowGlossaryPort = createWorkflowGlossaryMountPort({
    apiPrefix: "/glossary/api",
    fetchGlossaries: async () => [],
  });
  const uploadTilePort = createUploadTileUiPort({
    setUploadActionSlotVisible: () => "action-slot",
  });
  const workflowViewMountPort = createWorkflowViewMountPort({
    uploadTilePort,
    viewPort: {
      closeDeveloperDialog: () => "close-dialog",
    },
  });
  const ports = createUploadWorkflowMountPorts({
    credentialsStateMountPort,
    featureControllersPort,
    uploadRuntimePort,
    workflowConfigRuntimePort,
    workflowGlossaryPort,
    workflowViewMountPort,
  });

  assert.equal(ports.credentialsStateMountPort, credentialsStateMountPort);
  assert.equal(ports.credentialsStatePort, credentialsStatePort);
  assert.equal(ports.featureControllersPort, featureControllersPort);
  assert.equal(featureControllersPort.developerControllerPort, developerControllerPort);
  assert.equal(featureControllersPort.uploadControllerPort, uploadControllerPort);
  assert.equal(featureControllersPort.uploadFormDataPort, uploadFormDataPort);
  assert.equal(featureControllersPort.workflowControllerPort, workflowControllerPort);
  assert.equal(ports.uploadRuntimePort, uploadRuntimePort);
  assert.equal(ports.workflowConfigRuntimePort, workflowConfigRuntimePort);
  assert.equal(ports.workflowGlossaryPort, workflowGlossaryPort);
  assert.equal(ports.workflowViewMountPort, workflowViewMountPort);
  assert.equal(ports.uploadTilePort, uploadTilePort);
  assert.equal(ports.workflowViewPort, workflowViewMountPort.workflowViewPort);
  assert.deepEqual(ports.collectUploadFormData(), { file: "upload.pdf" });
  assert.deepEqual(ports.mountDeveloperFeature(), { name: "developer" });
  assert.deepEqual(ports.mountUploadFeature(), { name: "upload" });
  assert.deepEqual(ports.mountWorkflowFeature(), { name: "workflow" });
  assert.equal(ports.apiBase, "http://upload.test");
  assert.equal(ports.frontMaxPageCount, 321);
  assert.equal(ports.defaultModelName(), "model-from-group");
  assert.equal(ports.apiPrefix, "/glossary/api");
  assert.equal(ports.fetchGlossaries, workflowGlossaryPort.fetchGlossaries);
});

test("upload workflow mount payloads preserve delayed feature callbacks", () => {
  const calls = [];
  const state = { marker: "upload-workflow-state" };
  const uploadStatePort = {
    getSnapshot: () => ({ fileName: "late.pdf" }),
  };
  const credentialsStatePort = {
    getDeepSeekBalanceState: () => ({ balanceCny: 12.5 }),
  };
  const ports = {
    apiBase: "http://upload.test",
    apiPrefix: "/api",
    clearFileInputValue: () => {},
    collectUploadFormData: () => ({}),
    constants: { workflowBook: "book" },
    countPdfPages: async () => 10,
    createUploadStatePort: () => uploadStatePort,
    credentialsStatePort,
    defaultFileLabel: "选择 PDF",
    defaultMineruToken: "mineru",
    defaultModelApiKey: "sk",
    defaultModelBaseUrl: "https://model",
    defaultModelName: "model",
    defaultOcrProvider: "paddle",
    defaultPaddleApiUrl: "https://ocr",
    defaultPaddleToken: "paddle",
    fetchGlossaries: async () => [],
    frontMaxBytes: 50,
    frontMaxPageCount: 999,
    getDeveloperConfig: (value) => {
      calls.push(["get-config", value.marker]);
      return { workflow: "book" };
    },
    isDesktopMode: (value) => {
      calls.push(["desktop", value.marker]);
      return false;
    },
    mountDeveloperFeature: (payload) => {
      calls.push(["mount-developer"]);
      return { payload };
    },
    mountUploadFeature: (payload) => {
      calls.push(["mount-upload"]);
      return {
        currentPageRanges: () => "1-3",
        payload,
        renderPageRangeSummary: () => "第 1-3 页",
      };
    },
    mountWorkflowFeature: (payload) => {
      calls.push(["mount-workflow"]);
      return {
        applyWorkflowMode: () => calls.push(["workflow-mode"]),
        payload,
        refreshSubmitControls: () => calls.push(["submit-controls"]),
        resetDeveloperDialog: () => calls.push(["reset-developer"]),
        saveDeveloperDialog: () => calls.push(["save-developer"]),
        syncDeveloperDialogFromState: () => calls.push(["sync-developer"]),
        updateDeveloperWorkflowFormState: () => calls.push(["workflow-form"]),
        workflowNeedsUpload: (workflow) => workflow !== "render",
      };
    },
    normalizeMathMode: (value) => value,
    normalizeWorkflow: (value) => value,
    resetDeveloperConfig: (value) => calls.push(["reset-config", value.marker]),
    resetUploadedFile: () => {},
    resetUploadProgress: () => {},
    saveDeveloperStoredConfig: () => {},
    setDeveloperConfig: (value, config) => calls.push(["set-config", value.marker, config.workflow]),
    setText: () => {},
    setUploadProgress: () => {},
    state,
    submitUploadRequest: async () => ({}),
    workflowViewPort: { marker: "workflow-view-port" },
    workflowConfigPort: { marker: "workflow-config" },
  };
  const features = {
    browserCredentialsFeature: {
      hasBrowserCredentials: () => true,
      refreshDeepSeekBalance: (options) => calls.push(["balance", options.reason]),
      updateCredentialGate: (options) => calls.push(["gate", options.workflow]),
    },
  };

  mountUploadWorkflowFeatures(features, { ports });

  const workflowPayload = features.workflowFeature.payload;
  const developerPayload = features.developerFeature.payload;
  const uploadPayload = features.uploadFeature.payload;
  assert.deepEqual(
    calls.map(([name]) => name),
    ["mount-workflow", "mount-developer", "mount-upload"],
  );
  assert.equal(features.uploadStatePort, uploadStatePort);
  assert.equal(features.credentialsStatePort, credentialsStatePort);
  assert.equal(workflowPayload.getUploadState, uploadStatePort.getSnapshot);
  assert.deepEqual(workflowPayload.getDeepSeekBalanceState(), { balanceCny: 12.5 });
  assert.deepEqual(workflowPayload.getDeveloperConfig(), { workflow: "book" });
  assert.equal(workflowPayload.currentPageRanges(), "1-3");
  assert.equal(workflowPayload.renderPageRangeSummary(), "第 1-3 页");
  assert.equal(workflowPayload.hasBrowserCredentials(), true);
  assert.equal(workflowPayload.viewPort, ports.workflowViewPort);
  workflowPayload.updateCredentialGate({ workflow: "book" });
  workflowPayload.isDesktopMode();
  workflowPayload.resetDeveloperConfig();
  workflowPayload.setDeveloperConfig({ workflow: "render" });
  developerPayload.syncDeveloperDialogFromState();
  developerPayload.updateDeveloperWorkflowFormState();
  developerPayload.saveDeveloperDialog();
  developerPayload.resetDeveloperDialog();
  uploadPayload.applyWorkflowMode();
  uploadPayload.refreshSubmitControls();
  uploadPayload.refreshDeepSeekBalance({ reason: "upload" });
  assert.equal(uploadPayload.workflowNeedsUpload("render"), false);
  assert.equal(uploadPayload.uploadStatePort, uploadStatePort);
  assert.deepEqual(calls.slice(3), [
    ["get-config", "upload-workflow-state"],
    ["gate", "book"],
    ["desktop", "upload-workflow-state"],
    ["reset-config", "upload-workflow-state"],
    ["set-config", "upload-workflow-state", "render"],
    ["sync-developer"],
    ["workflow-form"],
    ["save-developer"],
    ["reset-developer"],
    ["workflow-mode"],
    ["submit-controls"],
    ["balance", "upload"],
  ]);
});

test("upload workflow feature payload builders pass through stable port fields", () => {
  const uploadStatePort = { getSnapshot: () => ({}) };
  const credentialsStatePort = { getDeepSeekBalanceState: () => ({}) };
  const ports = {
    apiBase: "http://api",
    apiPrefix: "/api",
    clearFileInputValue: () => {},
    collectUploadFormData: () => ({}),
    constants: {},
    countPdfPages: () => {},
    defaultFileLabel: "file",
    defaultMineruToken: "mineru",
    defaultModelApiKey: "sk",
    defaultModelBaseUrl: "base",
    defaultModelName: "model",
    defaultOcrProvider: "paddle",
    defaultPaddleApiUrl: "ocr",
    defaultPaddleToken: "token",
    fetchGlossaries: () => [],
    frontMaxBytes: 1,
    frontMaxPageCount: 2,
    getDeveloperConfig: () => ({}),
    isDesktopMode: () => false,
    normalizeMathMode: (value) => value,
    normalizeWorkflow: (value) => value,
    resetDeveloperConfig: () => {},
    resetUploadedFile: () => {},
    resetUploadProgress: () => {},
    saveDeveloperStoredConfig: () => {},
    setDeveloperConfig: () => {},
    setText: () => {},
    setUploadProgress: () => {},
    state: {},
    submitUploadRequest: () => {},
    workflowConfigPort: {},
    workflowViewPort: { marker: "workflow-view-port" },
  };
  const workflowPorts = {
    applyWorkflowMode: () => "apply",
    refreshSubmitControls: () => "refresh",
    resetDeveloperDialog: () => "reset",
    saveDeveloperDialog: () => "save",
    syncDeveloperDialogFromState: () => "sync",
    updateDeveloperWorkflowFormState: () => "form",
    workflowNeedsUpload: () => true,
  };
  const uploadPorts = {
    currentPageRanges: () => "1",
    renderPageRangeSummary: () => "page 1",
  };
  const credentialsPorts = {
    hasBrowserCredentials: () => true,
    refreshDeepSeekBalance: () => "balance",
    updateCredentialGate: () => "gate",
  };

  const workflowPayload = buildWorkflowFeatureMountPayload({
    credentialsPorts,
    credentialsStatePort,
    ports,
    uploadPorts,
    uploadStatePort,
  });
  const developerPayload = buildDeveloperFeatureMountPayload({ workflowPorts });
  const uploadPayload = buildUploadFeatureMountPayload({
    credentialsPorts,
    ports,
    uploadStatePort,
    workflowPorts,
  });

  assert.equal(workflowPayload.configPort, ports.workflowConfigPort);
  assert.equal(workflowPayload.viewPort, ports.workflowViewPort);
  assert.equal(workflowPayload.currentPageRanges, uploadPorts.currentPageRanges);
  assert.equal(workflowPayload.hasBrowserCredentials, credentialsPorts.hasBrowserCredentials);
  assert.equal(developerPayload.saveDeveloperDialog, workflowPorts.saveDeveloperDialog);
  assert.equal(uploadPayload.uploadStatePort, uploadStatePort);
  assert.equal(uploadPayload.applyWorkflowMode, workflowPorts.applyWorkflowMode);
  assert.equal(uploadPayload.refreshDeepSeekBalance, credentialsPorts.refreshDeepSeekBalance);
});

test("workflow config mount ports expose grouped defaults runtime and state ports", () => {
  const defaultsPort = createWorkflowConfigDefaultsPort({
    modelDefaultsPort: createWorkflowConfigModelDefaultsPort({
      defaultModelName: () => "workflow-default-model",
      defaultModelBaseUrl: () => "https://workflow-model.test",
    }),
    ocrDefaultsPort: createWorkflowConfigOcrDefaultsPort({
      defaultOcrProvider: () => "paddle",
      defaultPaddleApiUrl: () => "https://workflow-ocr.test",
    }),
  });
  const legacyOverrideDefaultsPort = createWorkflowConfigDefaultsPort({
    defaultModelName: () => "legacy-workflow-model",
  });
  const constantRuntimePort = createWorkflowConfigConstantRuntimePort({
    constants: { workflowBook: "book-runtime" },
  });
  const desktopRuntimePort = createWorkflowConfigDesktopRuntimePort({
    isDesktopMode: () => true,
  });
  const featureRuntimePort = createWorkflowConfigFeatureRuntimePort({
    workflowConfigPort: { marker: "workflow-config-runtime" },
  });
  const normalizerRuntimePort = createWorkflowConfigNormalizerRuntimePort({
    normalizeMathMode: (value) => `math:${value}`,
    normalizeWorkflow: (value) => `normalized:${value}`,
  });
  const runtimePort = createWorkflowConfigRuntimePort({
    constantRuntimePort,
    desktopRuntimePort,
    featureRuntimePort,
    normalizerRuntimePort,
  });
  const legacyOverrideRuntimePort = createWorkflowConfigRuntimePort({
    normalizeWorkflow: (value) => `legacy:${value}`,
  });
  const developerStatePort = createWorkflowConfigDeveloperStatePort({
    getDeveloperConfig: () => ({ workflow: "book" }),
  });
  const persistencePort = createWorkflowConfigPersistencePort({
    saveDeveloperStoredConfig: () => "saved-workflow-config",
  });
  const statePort = createWorkflowConfigStatePort({
    developerStatePort,
    persistencePort,
  });
  const legacyOverrideStatePort = createWorkflowConfigStatePort({
    getDeveloperConfig: () => ({ workflow: "legacy" }),
  });
  const ports = createWorkflowConfigMountPort({
    defaultsPort,
    runtimePort,
    statePort,
  });

  assert.equal(ports.defaultsPort, defaultsPort);
  assert.equal(defaultsPort.modelDefaultsPort.defaultModelBaseUrl(), "https://workflow-model.test");
  assert.equal(defaultsPort.ocrDefaultsPort.defaultPaddleApiUrl(), "https://workflow-ocr.test");
  assert.equal(ports.runtimePort, runtimePort);
  assert.equal(runtimePort.constantRuntimePort, constantRuntimePort);
  assert.equal(runtimePort.desktopRuntimePort, desktopRuntimePort);
  assert.equal(runtimePort.featureRuntimePort, featureRuntimePort);
  assert.equal(runtimePort.normalizerRuntimePort, normalizerRuntimePort);
  assert.deepEqual(ports.constants, { workflowBook: "book-runtime" });
  assert.equal(ports.isDesktopMode(), true);
  assert.deepEqual(ports.workflowConfigPort, { marker: "workflow-config-runtime" });
  assert.equal(ports.normalizeMathMode("inline"), "math:inline");
  assert.equal(ports.statePort, statePort);
  assert.equal(statePort.developerStatePort, developerStatePort);
  assert.equal(statePort.persistencePort, persistencePort);
  assert.equal(ports.defaultModelName(), "workflow-default-model");
  assert.equal(ports.normalizeWorkflow("book"), "normalized:book");
  assert.deepEqual(ports.getDeveloperConfig(), { workflow: "book" });
  assert.equal(ports.saveDeveloperStoredConfig(), "saved-workflow-config");
  assert.equal(legacyOverrideDefaultsPort.defaultModelName(), "legacy-workflow-model");
  assert.equal(legacyOverrideRuntimePort.normalizeWorkflow("book"), "legacy:book");
  assert.deepEqual(legacyOverrideStatePort.getDeveloperConfig(), { workflow: "legacy" });
});

test("workflow glossary mount ports expose grouped runtime data and ui ports", async () => {
  const configPort = createWorkflowGlossaryRuntimeConfigPort({
    apiPrefix: "/workflow-glossary/api",
  });
  const runtimePort = createWorkflowGlossaryRuntimePort({
    configPort,
  });
  const legacyOverrideRuntimePort = createWorkflowGlossaryRuntimePort({
    apiPrefix: "/legacy-workflow-glossary/api",
  });
  const dataPort = createWorkflowGlossaryDataPort({
    fetchGlossaries: async () => ({ items: ["workflow-glossary"] }),
  });
  const uiPort = createWorkflowGlossaryUiPort({
    setText: () => {},
  });
  const ports = createWorkflowGlossaryMountPort({
    runtimePort,
    dataPort,
    uiPort,
  });

  assert.equal(ports.runtimePort, runtimePort);
  assert.equal(runtimePort.configPort, configPort);
  assert.equal(legacyOverrideRuntimePort.apiPrefix, "/legacy-workflow-glossary/api");
  assert.equal(ports.dataPort, dataPort);
  assert.equal(ports.uiPort, uiPort);
  assert.equal(ports.apiPrefix, "/workflow-glossary/api");
  assert.deepEqual(await ports.fetchGlossaries(), { items: ["workflow-glossary"] });
  assert.equal(ports.setText, uiPort.setText);
});

test("upload runtime mount ports expose grouped config data state and ui ports", async () => {
  const defaultsPort = createUploadRuntimeDefaultsPort({
    frontMaxBytes: 12345,
    frontMaxPageCount: 999,
  });
  const configPort = createUploadRuntimeConfigPort({
    runtimePort: {
      apiBase: "http://upload-runtime.test",
    },
    defaultsPort,
  });
  const legacyOverrideConfigPort = createUploadRuntimeConfigPort({
    apiBase: "http://upload-runtime.test",
    frontMaxBytes: 45678,
  });
  const httpPort = createUploadRuntimeHttpPort({
    submitUploadRequest: async () => ({ upload_id: "upload-runtime" }),
  });
  const pdfPort = createUploadRuntimePdfPort({
    countPdfPages: async () => 12,
  });
  const dataPort = createUploadRuntimeDataPort({
    httpPort,
    pdfPort,
  });
  const legacyStatePort = createUploadRuntimeLegacyStatePort({
    state: { marker: "upload-state" },
  });
  const statePort = createUploadRuntimeStatePort({
    createUploadStatePort: () => ({ getSnapshot: () => ({ uploadId: "state-upload" }) }),
  });
  const jobActionsPort = createUploadRuntimeJobActionsPort({
    clearFileInputValue: () => "clear-upload",
    setUploadProgress: () => "set-upload-progress",
  });
  const uiPort = createUploadRuntimeUiPort({
    jobActionsPort,
  });
  const legacyOverrideUiPort = createUploadRuntimeUiPort({
    clearFileInputValue: () => "legacy-clear-upload",
  });
  const ports = createUploadRuntimeMountPort({
    configPort,
    dataPort,
    legacyStatePort,
    statePort,
    uiPort,
  });

  assert.equal(ports.configPort, configPort);
  assert.equal(configPort.defaultsPort, defaultsPort);
  assert.equal(configPort.runtimePort.apiBase, "http://upload-runtime.test");
  assert.equal(legacyOverrideConfigPort.frontMaxBytes, 45678);
  assert.equal(ports.dataPort, dataPort);
  assert.equal(dataPort.httpPort, httpPort);
  assert.equal(dataPort.pdfPort, pdfPort);
  assert.equal(ports.legacyStatePort, legacyStatePort);
  assert.equal(ports.statePort, statePort);
  assert.equal(ports.uiPort, uiPort);
  assert.equal(uiPort.jobActionsPort, jobActionsPort);
  assert.equal(ports.apiBase, "http://upload-runtime.test");
  assert.equal(ports.frontMaxBytes, 12345);
  assert.equal(ports.frontMaxPageCount, 999);
  assert.deepEqual(await ports.submitUploadRequest(), { upload_id: "upload-runtime" });
  assert.equal(await ports.countPdfPages(), 12);
  assert.deepEqual(ports.state, { marker: "upload-state" });
  assert.deepEqual(ports.createUploadStatePort().getSnapshot(), { uploadId: "state-upload" });
  assert.equal(ports.clearFileInputValue, uiPort.clearFileInputValue);
  assert.equal(ports.setUploadProgress, uiPort.setUploadProgress);
  assert.equal(uiPort.clearFileInputValue(), "clear-upload");
  assert.equal(uiPort.setUploadProgress(), "set-upload-progress");
  assert.equal(legacyOverrideUiPort.clearFileInputValue(), "legacy-clear-upload");
});
