import test from "node:test";
import assert from "node:assert/strict";

import {
  createJobMountPorts,
} from "../src/js/bootstrap/job-mount-ports.js";
import {
  buildJobRuntimeMountPayload,
  buildStatusDetailMountPayload,
} from "../src/js/bootstrap/job-feature-mount-payloads.js";
import {
  mountJobFeatures,
} from "../src/js/bootstrap/mount-job-features.js";
import {
  createJobFeatureControllersPort,
} from "../src/js/bootstrap/job-feature-controllers-port.js";
import {
  createJobRuntimeFeatureControllerPort,
} from "../src/js/bootstrap/job-runtime-feature-controller-port.js";
import {
  createStatusDetailFeatureControllerPort,
} from "../src/js/bootstrap/status-detail-feature-controller-port.js";
import {
  createJobDataMountPort,
} from "../src/js/bootstrap/job-data-mount-port.js";
import {
  createJobDataHttpPort,
} from "../src/js/bootstrap/job-data-http-port.js";
import {
  createJobDataControlPort,
} from "../src/js/bootstrap/job-data-control-port.js";
import {
  createJobDataJobsPort,
} from "../src/js/bootstrap/job-data-jobs-port.js";
import {
  createJobDataReadPort,
} from "../src/js/bootstrap/job-data-read-port.js";
import {
  createJobDataStatusPort,
} from "../src/js/bootstrap/job-data-status-port.js";
import {
  createJobRuntimeMountPort,
} from "../src/js/bootstrap/job-runtime-mount-port.js";
import {
  createJobRuntimeConfigPort,
} from "../src/js/bootstrap/job-runtime-config-port.js";
import {
  createJobRuntimeShellPort,
} from "../src/js/bootstrap/job-runtime-shell-port.js";
import {
  createJobTranslationDebugMountPort,
} from "../src/js/bootstrap/job-translation-debug-mount-port.js";
import {
  createJobTranslationDebugDataPort,
} from "../src/js/bootstrap/job-translation-debug-data-port.js";
import {
  createJobUiMountPort,
} from "../src/js/bootstrap/job-ui-mount-port.js";
import {
  createJobUiPresentationPort,
} from "../src/js/bootstrap/job-ui-presentation-port.js";
import {
  createJobUiRenderPort,
} from "../src/js/bootstrap/job-ui-render-port.js";
import {
  createJobUiWorkflowPresentationPort,
} from "../src/js/bootstrap/job-ui-workflow-presentation-port.js";
import {
  createJobUiJobActionsPort,
} from "../src/js/bootstrap/job-ui-job-actions-port.js";
import {
  createJobUiTextPort,
} from "../src/js/bootstrap/job-ui-text-port.js";

test("job mount ports can be overridden as one bootstrap dependency group", () => {
  const override = {
    apiPrefix: "/custom/api",
    state: { marker: true },
    fetchJobPayload: async () => ({ job_id: "job-1" }),
    renderJob: () => {},
    setText: () => {},
  };
  const ports = createJobMountPorts(override);

  assert.equal(ports.apiPrefix, "/custom/api");
  assert.deepEqual(ports.state, { marker: true });
  assert.equal(ports.fetchJobPayload, override.fetchJobPayload);
  assert.equal(ports.renderJob, override.renderJob);
  assert.equal(ports.setText, override.setText);
  assert.equal(typeof ports.fetchJobEvents, "function");
  assert.equal(typeof ports.retryJobStage, "function");
  assert.equal(typeof ports.resetStatePort?.resetJob, "function");
  assert.equal(typeof ports.resetStatePort?.resetSecondary, "function");
  assert.equal(typeof ports.resetStatePort?.resetUpload, "function");
  assert.equal(typeof ports.shellViewPort, "object");
  assert.equal(typeof ports.shellViewPort.closeDialogs, "function");
});

test("job feature mount payloads preserve delayed feature callbacks", () => {
  const calls = [];
  const features = {
    libraryEventPort: { marker: "library-events" },
    readerDialogFeature: {
      close: () => calls.push(["reader-close"]),
      syncToolbarActions: () => calls.push(["reader-sync"]),
    },
    uploadFeature: {
      clearPageRanges: () => calls.push(["clear-ranges"]),
    },
    uploadStatePort: { marker: "upload-state-port" },
    workflowFeature: {
      applyWorkflowMode: () => calls.push(["workflow-mode"]),
    },
  };
  const ports = {
    apiPrefix: "/job/api",
    buildJobDetailEndpoint: () => "/detail",
    fetchJobArtifactsManifest: async () => {},
    fetchJobDiagnostics: async () => {},
    fetchJobEvents: async () => {},
    fetchJobPayload: async () => {},
    fetchJobStageActions: async () => {},
    fetchResumePlan: async () => {},
    fetchTranslationDiagnostics: async () => {},
    fetchTranslationItem: async () => {},
    fetchTranslationItems: async () => {},
    mountJobRuntimeFeature: (payload) => {
      calls.push(["mount-runtime"]);
      assert.equal(payload.uploadStatePort, features.uploadStatePort);
      assert.equal(payload.libraryEventPort, features.libraryEventPort);
      return {
        startPolling: (jobId) => calls.push(["runtime-poll", jobId]),
      };
    },
    mountStatusDetailFeature: (payload) => {
      calls.push(["mount-status"]);
      return {
        activateDetailTab: (name) => calls.push(["activate", name]),
        statusPayload: payload,
      };
    },
    renderJob: () => {},
    renderJobSecondaryPatch: () => {},
    replayTranslationItem: async () => {},
    rerunJob: async () => {},
    resetUploadedFile: () => {},
    resetUploadProgress: () => {},
    retryJobStage: async () => {},
    setText: () => {},
    setWorkflowSections: () => {},
    shellViewPort: { closeDialogs: () => {} },
    state: { marker: "job-state" },
    submitJson: async () => {},
    updateJobWarning: () => {},
  };

  const statusPayload = buildStatusDetailMountPayload({ features, ports });
  features.jobRuntimeFeature = {
    startPolling: (jobId) => calls.push(["late-poll", jobId]),
  };
  statusPayload.startPolling("job-late");

  const runtimePayload = buildJobRuntimeMountPayload({ features, ports });
  features.statusDetailFeature = {
    activateDetailTab: (name) => calls.push(["activate", name]),
  };
  runtimePayload.applyWorkflowMode();
  runtimePayload.clearPageRanges();
  runtimePayload.activateDetailTab("translation");
  runtimePayload.onReaderDialogSync();
  runtimePayload.onReaderDialogClose();

  delete features.jobRuntimeFeature;
  mountJobFeatures(features, { ports });
  features.statusDetailFeature.statusPayload.startPolling("job-mounted");

  assert.deepEqual(calls, [
    ["late-poll", "job-late"],
    ["workflow-mode"],
    ["clear-ranges"],
    ["activate", "translation"],
    ["reader-sync"],
    ["reader-close"],
    ["mount-status"],
    ["mount-runtime"],
    ["runtime-poll", "job-mounted"],
  ]);
});

test("job mount ports expose grouped job runtime, data, debug, and ui ports", async () => {
  const jobRuntimeControllerPort = createJobRuntimeFeatureControllerPort({
    mountJobRuntimeFeature: () => ({ name: "job-runtime" }),
  });
  const statusDetailControllerPort = createStatusDetailFeatureControllerPort({
    mountStatusDetailFeature: () => ({ name: "status-detail" }),
  });
  const featureControllersPort = createJobFeatureControllersPort({
    jobRuntimeControllerPort,
    statusDetailControllerPort,
  });
  const httpPort = createJobDataHttpPort({
    submitJson: async () => ({ submitted: true }),
  });
  const readPort = createJobDataReadPort({
    fetchJobPayload: async () => ({ job_id: "job-data" }),
    fetchJobArtifactsManifest: async () => ({ artifacts: ["pdf"] }),
  });
  const statusPort = createJobDataStatusPort({
    fetchJobEvents: async () => ({ events: ["event"] }),
    fetchJobStageActions: async () => ({ actions: ["retry"] }),
  });
  const controlPort = createJobDataControlPort({
    retryJobStage: async () => ({ job_id: "retry-job" }),
    rerunJob: async () => ({ job_id: "rerun-job" }),
  });
  const jobsPort = createJobDataJobsPort({
    controlPort,
    readPort,
    statusPort,
  });
  const legacyOverrideJobsPort = createJobDataJobsPort({
    fetchJobPayload: async () => ({ job_id: "legacy-job-port" }),
  });
  const dataPort = createJobDataMountPort({
    httpPort,
    jobsPort,
  });
  const legacyOverrideDataPort = createJobDataMountPort({
    fetchJobPayload: async () => ({ job_id: "legacy-job-data" }),
  });
  const configPort = createJobRuntimeConfigPort({
    apiPrefix: "/job/api",
  });
  const shellPort = createJobRuntimeShellPort({
    shellViewPort: { closeDialogs() {} },
  });
  const runtimePort = createJobRuntimeMountPort({
    configPort,
    shellPort,
  });
  const legacyOverrideRuntimePort = createJobRuntimeMountPort({
    apiPrefix: "/legacy-job/api",
  });
  const translationDebugPort = createJobTranslationDebugMountPort({
    fetchTranslationDiagnostics: async () => ({ summary: "debug-ok" }),
  });
  const translationDebugDataPort = createJobTranslationDebugDataPort({
    fetchTranslationItem: async () => ({ item_id: "item-data" }),
  });
  const groupedTranslationDebugPort = createJobTranslationDebugMountPort({
    dataPort: translationDebugDataPort,
  });
  const legacyOverrideTranslationDebugPort = createJobTranslationDebugMountPort({
    fetchTranslationItem: async () => ({ item_id: "item-legacy" }),
  });
  const uiRenderPort = createJobUiRenderPort({
    renderJob: () => "rendered-job",
    renderJobSecondaryPatch: () => "secondary-patch",
  });
  const uiWorkflowPresentationPort = createJobUiWorkflowPresentationPort({
    setWorkflowSections: () => "workflow-sections",
    updateJobWarning: () => "job-warning",
  });
  const uiPresentationPort = createJobUiPresentationPort({
    renderPort: uiRenderPort,
    workflowPresentationPort: uiWorkflowPresentationPort,
  });
  const legacyOverridePresentationPort = createJobUiPresentationPort({
    renderJob: () => "legacy-presentation-rendered-job",
  });
  const uiJobActionsPort = createJobUiJobActionsPort({
    resetUploadProgress: () => "reset-progress",
  });
  const uiTextPort = createJobUiTextPort({
    setText: () => "text-set",
  });
  const uiPort = createJobUiMountPort({
    jobActionsPort: uiJobActionsPort,
    presentationPort: uiPresentationPort,
    textPort: uiTextPort,
  });
  const legacyOverrideUiPort = createJobUiMountPort({
    renderJob: () => "legacy-rendered-job",
  });
  const ports = createJobMountPorts({
    dataPort,
    featureControllersPort,
    runtimePort,
    translationDebugPort,
    uiPort,
  });

  assert.equal(ports.dataPort, dataPort);
  assert.equal(ports.featureControllersPort, featureControllersPort);
  assert.equal(featureControllersPort.jobRuntimeControllerPort, jobRuntimeControllerPort);
  assert.equal(featureControllersPort.statusDetailControllerPort, statusDetailControllerPort);
  assert.deepEqual(ports.mountJobRuntimeFeature(), { name: "job-runtime" });
  assert.deepEqual(ports.mountStatusDetailFeature(), { name: "status-detail" });
  assert.equal(dataPort.httpPort, httpPort);
  assert.equal(dataPort.jobsPort, jobsPort);
  assert.equal(jobsPort.controlPort, controlPort);
  assert.equal(jobsPort.readPort, readPort);
  assert.equal(jobsPort.statusPort, statusPort);
  assert.deepEqual(await dataPort.submitJson(), { submitted: true });
  assert.deepEqual(await jobsPort.fetchJobArtifactsManifest(), { artifacts: ["pdf"] });
  assert.deepEqual(await jobsPort.fetchJobEvents(), { events: ["event"] });
  assert.deepEqual(await jobsPort.fetchJobStageActions(), { actions: ["retry"] });
  assert.deepEqual(await jobsPort.rerunJob(), { job_id: "rerun-job" });
  assert.deepEqual(await legacyOverrideJobsPort.fetchJobPayload(), { job_id: "legacy-job-port" });
  assert.deepEqual(await legacyOverrideDataPort.fetchJobPayload(), { job_id: "legacy-job-data" });
  assert.equal(ports.runtimePort, runtimePort);
  assert.equal(runtimePort.configPort, configPort);
  assert.equal(runtimePort.shellPort, shellPort);
  assert.equal(legacyOverrideRuntimePort.apiPrefix, "/legacy-job/api");
  assert.equal(ports.translationDebugPort, translationDebugPort);
  assert.equal(groupedTranslationDebugPort.dataPort, translationDebugDataPort);
  assert.equal(ports.uiPort, uiPort);
  assert.equal(ports.apiPrefix, "/job/api");
  assert.equal(ports.shellViewPort, shellPort.shellViewPort);
  assert.deepEqual(await ports.fetchJobPayload(), { job_id: "job-data" });
  assert.deepEqual(await ports.retryJobStage(), { job_id: "retry-job" });
  assert.deepEqual(await ports.fetchTranslationDiagnostics(), { summary: "debug-ok" });
  assert.deepEqual(await groupedTranslationDebugPort.fetchTranslationItem(), { item_id: "item-data" });
  assert.deepEqual(await legacyOverrideTranslationDebugPort.fetchTranslationItem(), { item_id: "item-legacy" });
  assert.equal(uiPort.presentationPort, uiPresentationPort);
  assert.equal(uiPresentationPort.renderPort, uiRenderPort);
  assert.equal(uiPresentationPort.workflowPresentationPort, uiWorkflowPresentationPort);
  assert.equal(uiPort.jobActionsPort, uiJobActionsPort);
  assert.equal(uiPort.textPort, uiTextPort);
  assert.equal(uiPort.renderJob(), "rendered-job");
  assert.equal(uiPort.renderJobSecondaryPatch(), "secondary-patch");
  assert.equal(uiPort.setWorkflowSections(), "workflow-sections");
  assert.equal(uiPort.updateJobWarning(), "job-warning");
  assert.equal(legacyOverridePresentationPort.renderJob(), "legacy-presentation-rendered-job");
  assert.equal(uiPort.resetUploadProgress(), "reset-progress");
  assert.equal(uiPort.setText(), "text-set");
  assert.equal(legacyOverrideUiPort.renderJob(), "legacy-rendered-job");
  assert.equal(ports.setText, uiPort.setText);
});
