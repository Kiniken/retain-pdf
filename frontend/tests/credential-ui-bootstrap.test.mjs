import test from "node:test";
import assert from "node:assert/strict";

import {
  createCredentialActionMountPorts,
} from "../src/js/bootstrap/credential-action-mount-ports.js";
import {
  createCredentialUiMountPort,
} from "../src/js/bootstrap/credential-ui-mount-port.js";
import {
  createCredentialUiHiddenPort,
} from "../src/js/bootstrap/credential-ui-hidden-port.js";
import {
  createCredentialUiJobActionsPort,
} from "../src/js/bootstrap/credential-ui-job-actions-port.js";
import {
  createCredentialUiJobActionEffectsPort,
} from "../src/js/bootstrap/credential-ui-job-action-effects-port.js";
import {
  createCredentialUiPresentationPort,
} from "../src/js/bootstrap/credential-ui-presentation-port.js";
import {
  createCredentialUiTextPort,
} from "../src/js/bootstrap/credential-ui-text-port.js";
import {
  createCredentialLegacyStateMountPort,
} from "../src/js/bootstrap/credential-legacy-state-mount-port.js";

test("credential ui mount port groups hidden credential and shared ui effects", () => {
  const calls = [];
  const port = createCredentialUiMountPort({
    applyHiddenCredentialInputs: (credentials) => calls.push(["apply", credentials]),
    readHiddenCredentialInputs: () => ({ modelApiKey: "sk-ui" }),
    renderJob: (payload) => calls.push(["render", payload.job_id]),
    resetUploadedFile: () => calls.push(["reset-upload"]),
    setText: (id, text) => calls.push(["text", id, text]),
  });
  const ports = createCredentialActionMountPorts({
    uiPort: port,
  });

  assert.equal(ports.uiPort, port);
  ports.applyHiddenCredentialInputs({ modelApiKey: "sk-ui" });
  assert.deepEqual(ports.readHiddenCredentialInputs(), { modelApiKey: "sk-ui" });
  ports.renderJob({ job_id: "job-ui" });
  ports.resetUploadedFile();
  ports.setText("error-box", "ok");
  assert.deepEqual(calls, [
    ["apply", { modelApiKey: "sk-ui" }],
    ["render", "job-ui"],
    ["reset-upload"],
    ["text", "error-box", "ok"],
  ]);
});

test("credential ui mount port exposes grouped hidden job actions and text ports", () => {
  const calls = [];
  const hiddenPort = createCredentialUiHiddenPort({
    applyHiddenCredentialInputs: (credentials) => calls.push(["apply", credentials]),
    readHiddenCredentialInputs: () => ({ modelApiKey: "sk-hidden" }),
  });
  const jobActionEffectsPort = createCredentialUiJobActionEffectsPort({
    resetUploadedFile: () => calls.push(["reset-upload"]),
  });
  const presentationPort = createCredentialUiPresentationPort({
    renderJob: (payload) => calls.push(["render", payload.job_id]),
  });
  const jobActionsPort = createCredentialUiJobActionsPort({
    jobActionEffectsPort,
    presentationPort,
  });
  const legacyOverrideJobActionsPort = createCredentialUiJobActionsPort({
    renderJob: () => "legacy-render",
  });
  const textPort = createCredentialUiTextPort({
    setText: (id, text) => calls.push(["text", id, text]),
  });
  const port = createCredentialUiMountPort({
    hiddenPort,
    jobActionsPort,
    textPort,
  });

  assert.equal(port.hiddenPort, hiddenPort);
  assert.equal(port.jobActionsPort, jobActionsPort);
  assert.equal(jobActionsPort.jobActionEffectsPort, jobActionEffectsPort);
  assert.equal(jobActionsPort.presentationPort, presentationPort);
  assert.equal(port.textPort, textPort);
  port.applyHiddenCredentialInputs({ modelApiKey: "sk-hidden" });
  assert.deepEqual(port.readHiddenCredentialInputs(), { modelApiKey: "sk-hidden" });
  port.renderJob({ job_id: "job-actions" });
  port.resetUploadedFile();
  port.setText("error-box", "ready");
  assert.deepEqual(calls, [
    ["apply", { modelApiKey: "sk-hidden" }],
    ["render", "job-actions"],
    ["reset-upload"],
    ["text", "error-box", "ready"],
  ]);
  assert.equal(legacyOverrideJobActionsPort.renderJob(), "legacy-render");
});

test("credential legacy state mount port owns aggregate legacy state default", () => {
  const legacyState = { marker: "legacy-state" };
  const port = createCredentialLegacyStateMountPort({
    state: legacyState,
  });
  const ports = createCredentialActionMountPorts({
    legacyStatePort: port,
  });

  assert.equal(ports.legacyStatePort, port);
  assert.equal(ports.state, legacyState);
});
