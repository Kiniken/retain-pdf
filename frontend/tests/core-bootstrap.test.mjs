import test from "node:test";
import assert from "node:assert/strict";

import {
  createCoreFeatureMountPorts,
} from "../src/js/bootstrap/core-feature-mount-ports.js";
import {
  buildAppShellFeatureMountPayload,
  buildHomeFeatureMountPayload,
  buildTranslationWorkflowDialogMountPayload,
} from "../src/js/bootstrap/core-feature-mount-payloads.js";
import {
  mountCoreFeatures,
} from "../src/js/bootstrap/mount-core-features.js";
import {
  createCoreFeatureControllersPort,
} from "../src/js/bootstrap/core-feature-controllers-port.js";
import {
  createCoreAppShellFeatureControllerPort,
} from "../src/js/bootstrap/core-app-shell-feature-controller-port.js";
import {
  createCoreAppUpdateFeatureControllerPort,
} from "../src/js/bootstrap/core-app-update-feature-controller-port.js";
import {
  createCoreHomeFeatureControllerPort,
} from "../src/js/bootstrap/core-home-feature-controller-port.js";
import {
  createCoreTranslationWorkflowFeatureControllerPort,
} from "../src/js/bootstrap/core-translation-workflow-feature-controller-port.js";
import {
  createCoreAppShellUiMountPort,
} from "../src/js/bootstrap/core-app-shell-ui-mount-port.js";
import {
  createCoreAppShellJobActionsPort,
} from "../src/js/bootstrap/core-app-shell-job-actions-port.js";
import {
  createCoreAppShellActionButtonsPort,
} from "../src/js/bootstrap/core-app-shell-action-buttons-port.js";
import {
  createCoreAppShellFilePickerPort,
} from "../src/js/bootstrap/core-app-shell-file-picker-port.js";
import {
  createCoreAppShellProgressPort,
} from "../src/js/bootstrap/core-app-shell-progress-port.js";
import {
  createCoreAppShellUploadResetPort,
} from "../src/js/bootstrap/core-app-shell-upload-reset-port.js";
import {
  createCoreAppShellTextPort,
} from "../src/js/bootstrap/core-app-shell-text-port.js";
import {
  createCoreHomeMountPort,
} from "../src/js/bootstrap/core-home-mount-port.js";
import {
  createCorePresentationMountPort,
} from "../src/js/bootstrap/core-presentation-mount-port.js";

test("core feature mount ports can be overridden as one bootstrap dependency group", () => {
  const override = {
    createHomeStatePort: () => ({ getSnapshot: () => ({ viewMode: "library" }) }),
    prepareFilePicker: () => {},
    resetUploadProgress: () => {},
    setText: () => {},
  };
  const ports = createCoreFeatureMountPorts(override);

  assert.equal(ports.createHomeStatePort, override.createHomeStatePort);
  assert.equal(ports.prepareFilePicker, override.prepareFilePicker);
  assert.equal(ports.resetUploadProgress, override.resetUploadProgress);
  assert.equal(ports.setText, override.setText);
  assert.equal(typeof ports.setWorkflowSections, "function");
  assert.equal(typeof ports.updateJobWarning, "function");
  assert.equal(typeof ports.translationWorkflowStatusAreaPort?.hide, "function");
  assert.equal(typeof ports.translationWorkflowStatusAreaPort?.isVisible, "function");
  assert.equal(typeof ports.translationWorkflowStatusAreaPort?.returnHome, "function");
});

test("core feature mount ports expose grouped home shell ui and presentation ports", () => {
  const appShellControllerPort = createCoreAppShellFeatureControllerPort({
    mountAppShellFeature: () => ({ name: "app-shell" }),
  });
  const appUpdateControllerPort = createCoreAppUpdateFeatureControllerPort({
    mountAppUpdateFeature: () => ({ name: "app-update" }),
  });
  const homeControllerPort = createCoreHomeFeatureControllerPort({
    mountHomeFeature: () => ({ name: "home" }),
  });
  const translationWorkflowControllerPort = createCoreTranslationWorkflowFeatureControllerPort({
    mountTranslationWorkflowDialogFeature: () => ({ name: "translation-dialog" }),
  });
  const controllersPort = createCoreFeatureControllersPort({
    appShellControllerPort,
    appUpdateControllerPort,
    homeControllerPort,
    translationWorkflowControllerPort,
  });
  const homePort = createCoreHomeMountPort({
    createHomeStatePort: () => ({ getSnapshot: () => ({ viewMode: "core-library" }) }),
  });
  const actionButtonsPort = createCoreAppShellActionButtonsPort({
    updateActionButtons: () => "update-actions",
  });
  const filePickerPort = createCoreAppShellFilePickerPort({
    prepareFilePicker: () => "pick-file",
  });
  const progressPort = createCoreAppShellProgressPort({
    setLinearProgress: () => "set-linear",
  });
  const uploadResetPort = createCoreAppShellUploadResetPort({
    resetUploadProgress: () => "reset-upload-progress",
    resetUploadedFile: () => "reset-uploaded-file",
  });
  const jobActionsPort = createCoreAppShellJobActionsPort({
    actionButtonsPort,
    filePickerPort,
    progressPort,
    uploadResetPort,
  });
  const textPort = createCoreAppShellTextPort({
    setText: () => "text-set",
  });
  const appShellUiPort = createCoreAppShellUiMountPort({
    jobActionsPort,
    textPort,
  });
  const legacyOverrideAppShellUiPort = createCoreAppShellUiMountPort({
    prepareFilePicker: () => "legacy-pick-file",
  });
  const presentationPort = createCorePresentationMountPort({
    setWorkflowSections: () => {},
    updateJobWarning: () => {},
  });
  const translationWorkflowStatusAreaPort = {
    isVisible: () => true,
    returnHome: () => "return-home",
  };
  const ports = createCoreFeatureMountPorts({
    appShellUiPort,
    controllersPort,
    homePort,
    presentationPort,
    translationWorkflowStatusAreaPort,
  });

  assert.equal(ports.appShellUiPort, appShellUiPort);
  assert.equal(ports.controllersPort, controllersPort);
  assert.equal(controllersPort.appShellControllerPort, appShellControllerPort);
  assert.equal(controllersPort.appUpdateControllerPort, appUpdateControllerPort);
  assert.equal(controllersPort.homeControllerPort, homeControllerPort);
  assert.equal(controllersPort.translationWorkflowControllerPort, translationWorkflowControllerPort);
  assert.equal(appShellUiPort.jobActionsPort, jobActionsPort);
  assert.equal(jobActionsPort.actionButtonsPort, actionButtonsPort);
  assert.equal(jobActionsPort.filePickerPort, filePickerPort);
  assert.equal(jobActionsPort.progressPort, progressPort);
  assert.equal(jobActionsPort.uploadResetPort, uploadResetPort);
  assert.equal(appShellUiPort.textPort, textPort);
  assert.equal(ports.homePort, homePort);
  assert.equal(ports.presentationPort, presentationPort);
  assert.equal(ports.translationWorkflowStatusAreaPort, translationWorkflowStatusAreaPort);
  assert.deepEqual(ports.mountHomeFeature(), { name: "home" });
  assert.deepEqual(ports.mountAppUpdateFeature(), { name: "app-update" });
  assert.deepEqual(ports.mountTranslationWorkflowDialogFeature(), { name: "translation-dialog" });
  assert.deepEqual(ports.mountAppShellFeature(), { name: "app-shell" });
  assert.deepEqual(ports.createHomeStatePort().getSnapshot(), { viewMode: "core-library" });
  assert.equal(ports.prepareFilePicker, appShellUiPort.prepareFilePicker);
  assert.equal(appShellUiPort.prepareFilePicker(), "pick-file");
  assert.equal(appShellUiPort.updateActionButtons(), "update-actions");
  assert.equal(appShellUiPort.setLinearProgress(), "set-linear");
  assert.equal(appShellUiPort.resetUploadProgress(), "reset-upload-progress");
  assert.equal(appShellUiPort.resetUploadedFile(), "reset-uploaded-file");
  assert.equal(legacyOverrideAppShellUiPort.prepareFilePicker(), "legacy-pick-file");
  assert.equal(appShellUiPort.setText(), "text-set");
  assert.equal(ports.setText, appShellUiPort.setText);
  assert.equal(ports.setWorkflowSections, presentationPort.setWorkflowSections);
  assert.equal(ports.updateJobWarning, presentationPort.updateJobWarning);
});

test("core feature mount payloads preserve app shell delayed callbacks", () => {
  const calls = [];
  const homeStatePort = { getSnapshot: () => ({ viewMode: "library" }) };
  const state = { marker: "core-state" };
  const ports = {
    createHomeStatePort: (value) => {
      calls.push(["home-state", value.marker]);
      return homeStatePort;
    },
    mountHomeFeature: (payload) => {
      calls.push(["mount-home"]);
      return { payload };
    },
    isAppUpdateEnabled: () => true,
    mountAppUpdateFeature: (payload) => {
      calls.push(["mount-update", payload.enabled]);
      return { name: "app-update", payload };
    },
    mountTranslationWorkflowDialogFeature: (payload) => {
      calls.push(["mount-dialog"]);
      return { name: "translation-dialog", payload };
    },
    mountAppShellFeature: (payload) => {
      calls.push(["mount-shell"]);
      return { payload };
    },
    prepareFilePicker: () => "pick",
    resetUploadProgress: () => "reset-progress",
    resetUploadedFile: () => "reset-file",
    setLinearProgress: () => "linear",
    setText: () => "text",
    setWorkflowSections: () => "sections",
    updateActionButtons: () => "actions",
    updateJobWarning: () => "warning",
  };
  const features = {};

  assert.deepEqual(buildHomeFeatureMountPayload({ homeStatePort }), { statePort: homeStatePort });
  const dialogPayload = buildTranslationWorkflowDialogMountPayload({ features, homeStatePort, ports });
  assert.equal(dialogPayload.homeStatePort, homeStatePort);
  assert.equal(dialogPayload.statusAreaPort, ports.translationWorkflowStatusAreaPort);
  assert.equal(typeof dialogPayload.uploadSessionPort.resetUploadSession, "function");
  mountCoreFeatures(features, { ports, state });

  features.uploadFeature = {
    renderPageRangeSummary: () => "第 1 页",
  };
  features.workflowFeature = {
    applyWorkflowMode: () => calls.push(["workflow-mode"]),
  };
  features.statusDetailFeature = {
    activateDetailTab: (name) => calls.push(["tab", name]),
  };
  const shellPayload = features.appShellFeature.payload;
  assert.deepEqual(
    calls.map(([name]) => name),
    ["home-state", "mount-home", "mount-update", "mount-dialog", "mount-shell"],
  );
  assert.equal(features.homeFeature.payload.statePort, homeStatePort);
  assert.equal(features.appUpdateFeature.payload.enabled, true);
  assert.equal(
    features.translationWorkflowDialogFeature.payload.homeStatePort,
    homeStatePort,
  );
  assert.equal(shellPayload.translationWorkflowDialogFeature, features.translationWorkflowDialogFeature);
  assert.equal(shellPayload.prepareFilePicker, ports.prepareFilePicker);
  assert.equal(shellPayload.renderPageRangeSummary(), "第 1 页");
  shellPayload.applyWorkflowMode();
  shellPayload.activateDetailTab("translation");
  assert.deepEqual(calls.slice(5), [
    ["workflow-mode"],
    ["tab", "translation"],
  ]);
});

test("core app shell payload builder keeps stable port fields", () => {
  const features = {
    translationWorkflowDialogFeature: { name: "dialog" },
  };
  const ports = {
    prepareFilePicker: () => {},
    resetUploadProgress: () => {},
    resetUploadedFile: () => {},
    setLinearProgress: () => {},
    setText: () => {},
    setWorkflowSections: () => {},
    updateActionButtons: () => {},
    updateJobWarning: () => {},
  };

  const payload = buildAppShellFeatureMountPayload({ features, ports });

  assert.equal(payload.prepareFilePicker, ports.prepareFilePicker);
  assert.equal(payload.setText, ports.setText);
  assert.equal(payload.resetUploadedFile, ports.resetUploadedFile);
  assert.equal(payload.translationWorkflowDialogFeature, features.translationWorkflowDialogFeature);
});
