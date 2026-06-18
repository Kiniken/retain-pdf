import test from "node:test";
import assert from "node:assert/strict";

import {
  createCredentialActionMountPorts,
} from "../src/js/bootstrap/credential-action-mount-ports.js";
import {
  createCredentialActionFeatureControllersPort,
} from "../src/js/bootstrap/credential-action-feature-controllers-port.js";
import {
  buildAppActionsMountPayload,
  buildArtifactDownloadsMountPayload,
  buildBrowserCredentialsMountPayload,
} from "../src/js/bootstrap/credential-action-feature-payloads.js";
import {
  createCredentialAppActionsFeatureControllerPort,
} from "../src/js/bootstrap/credential-app-actions-feature-controller-port.js";
import {
  createCredentialArtifactDownloadsFeatureControllerPort,
} from "../src/js/bootstrap/credential-artifact-downloads-feature-controller-port.js";
import {
  createCredentialBrowserFeatureControllerPort,
} from "../src/js/bootstrap/credential-browser-feature-controller-port.js";

test("credential action mount ports can be overridden as one bootstrap dependency group", () => {
  const override = {
    apiPrefix: "/custom/api",
    state: { marker: true },
    fetchProtected: async () => "ok",
    setText: () => {},
  };
  const ports = createCredentialActionMountPorts(override);

  assert.equal(ports.apiPrefix, "/custom/api");
  assert.deepEqual(ports.state, { marker: true });
  assert.equal(ports.fetchProtected, override.fetchProtected);
  assert.equal(ports.setText, override.setText);
  assert.equal(typeof ports.validateOcrToken, "function");
  assert.equal(typeof ports.saveTaskOptions, "function");
  assert.equal(typeof ports.appActionsRuntimeEnvPort?.isDesktopMode, "function");
  assert.equal(typeof ports.appActionsUploadStatePort?.getSnapshot, "function");
  assert.equal(typeof ports.browserCredentialsRuntimeEnvPort?.isDesktopMode, "function");
  assert.equal(typeof ports.browserCredentialsUploadStatePort?.getSnapshot, "function");
});

test("credential action mount ports expose grouped feature controller ports", () => {
  const appActionsControllerPort = createCredentialAppActionsFeatureControllerPort({
    mountAppActionsFeature: () => ({ name: "app-actions" }),
  });
  const artifactDownloadsControllerPort = createCredentialArtifactDownloadsFeatureControllerPort({
    mountArtifactDownloadsFeature: () => ({ name: "artifact-downloads" }),
  });
  const browserCredentialsControllerPort = createCredentialBrowserFeatureControllerPort({
    mountBrowserCredentialsFeature: () => ({ name: "browser-credentials" }),
  });
  const featureControllersPort = createCredentialActionFeatureControllersPort({
    appActionsControllerPort,
    artifactDownloadsControllerPort,
    browserCredentialsControllerPort,
  });
  const ports = createCredentialActionMountPorts({
    featureControllersPort,
  });

  assert.equal(ports.featureControllersPort, featureControllersPort);
  assert.equal(featureControllersPort.appActionsControllerPort, appActionsControllerPort);
  assert.equal(featureControllersPort.artifactDownloadsControllerPort, artifactDownloadsControllerPort);
  assert.equal(featureControllersPort.browserCredentialsControllerPort, browserCredentialsControllerPort);
  assert.deepEqual(ports.mountAppActionsFeature(), { name: "app-actions" });
  assert.deepEqual(ports.mountArtifactDownloadsFeature(), { name: "artifact-downloads" });
  assert.deepEqual(ports.mountBrowserCredentialsFeature(), { name: "browser-credentials" });
});

test("credential action feature payloads preserve submit flow and credential callbacks", async () => {
  const calls = [];
  const appActionPorts = {
    checkApiConnectivity: () => calls.push(["check-api"]),
  };
  const workflowPorts = {
    applyWorkflowMode: () => calls.push(["workflow-mode"]),
    collectRunPayload: () => "payload",
    currentBudgetState: () => "budget",
    currentRenderSourceJobId: () => "render-source",
    currentWorkflow: () => "book",
    developerConfigWithDefaults: () => ({ glossary_id: "g1" }),
    workflowNeedsCredentials: () => true,
    workflowNeedsUpload: () => true,
  };
  const uploadPorts = {
    validatePageRanges: () => calls.push(["validate-pages"]),
  };
  const credentialsPorts = {
    ensureOcrCredentialsReady: () => calls.push(["ocr-ready"]),
    hasBrowserCredentials: () => true,
    openBrowserCredentialsDialog: () => calls.push(["open-credentials"]),
    refreshDeepSeekBalance: () => calls.push(["balance"]),
  };
  const jobRuntimePorts = {
    startJobPolling: (jobId) => calls.push(["poll", jobId]),
  };
  const libraryEventPort = { publish: () => {} };
  const uploadStatePort = { marker: "upload-state" };
  const credentialsStatePort = { marker: "credentials-state" };
  const ports = {
    apiPrefix: "/api",
    appActionsConfigPort: { apiBaseLabel: "api" },
    applyHiddenCredentialInputs: () => {},
    artifactDownloadsRuntimePort: { currentJobId: () => "job-download" },
    artifactDownloadNameResolver: { resolveTranslatedPdfName: () => "zh_book.pdf" },
    browserCredentialViewPort: { marker: "browser-credential-view-port" },
    buildApiEndpoint: () => "/endpoint",
    defaultMineruToken: "mineru",
    defaultModelApiKey: "sk",
    defaultModelBaseUrl: "https://model",
    defaultPaddleToken: "paddle",
    fetchProtected: async () => "protected",
    openDesktopOutputDirectory: () => {},
    openSetupDialog: () => calls.push(["setup"]),
    queryDeepSeekBalance: () => {},
    readHiddenCredentialInputs: () => {},
    renderJob: () => calls.push(["render"]),
    resetUploadedFile: () => {},
    saveBrowserStoredConfig: () => {},
    saveDesktopConfig: () => {},
    saveTaskOptions: () => {},
    setText: () => {},
    state: { marker: "state" },
    submitJobRequest: () => calls.push(["submit"]),
    validateDeepSeekToken: () => {},
    validateOcrToken: () => {},
  };

  const credentialPayload = buildBrowserCredentialsMountPayload({
    appActionPorts,
    credentialsStatePort,
    ports,
    uploadStatePort,
    workflowPorts,
  });
  const downloadPayload = buildArtifactDownloadsMountPayload({ ports });
  const appPayload = buildAppActionsMountPayload({
    credentialsPorts,
    jobRuntimePorts,
    libraryEventPort,
    ports,
    uploadPorts,
    uploadStatePort,
    workflowPorts,
  });

  credentialPayload.checkApiConnectivity();
  credentialPayload.onCredentialStateChange();
  appPayload.submitFlow.validateBeforeSubmit();
  appPayload.submitFlow.ensureOcrCredentialsReady();
  appPayload.submitFlow.openBrowserCredentialsDialog();
  appPayload.submitFlow.refreshDeepSeekBalance();
  appPayload.submitFlow.startJobPolling("job-1");

  assert.equal(credentialPayload.uploadStatePort, uploadStatePort);
  assert.equal(credentialPayload.credentialsStatePort, credentialsStatePort);
  assert.equal(credentialPayload.viewPort, ports.browserCredentialViewPort);
  assert.deepEqual(credentialPayload.getTaskOptions(), { glossary_id: "g1" });
  assert.equal(downloadPayload.fetchProtected, ports.fetchProtected);
  assert.equal(downloadPayload.runtimePort, ports.artifactDownloadsRuntimePort);
  assert.equal(downloadPayload.downloadNameResolver, ports.artifactDownloadNameResolver);
  assert.equal(appPayload.uploadStatePort, uploadStatePort);
  assert.equal(appPayload.submitFlow.collectRunPayload(), "payload");
  assert.equal(appPayload.submitFlow.currentWorkflow(), "book");
  assert.equal(appPayload.submitFlow.libraryEventPort, libraryEventPort);
  assert.equal(appPayload.submitFlow.openSetupDialog, ports.openSetupDialog);
  assert.equal(appPayload.submitFlow.renderJob, ports.renderJob);
  assert.equal(appPayload.submitFlow.submitJobRequest, ports.submitJobRequest);
  assert.deepEqual(calls, [
    ["check-api"],
    ["workflow-mode"],
    ["validate-pages"],
    ["ocr-ready"],
    ["open-credentials"],
    ["balance"],
    ["poll", "job-1"],
  ]);
});
