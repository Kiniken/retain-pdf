import test from "node:test";
import assert from "node:assert/strict";

import {
  applyPersistedConfig,
} from "../src/js/bootstrap/config-bootstrap.js";
import {
  buildHiddenCredentialPayload,
} from "../src/js/bootstrap/config-bootstrap-payloads.js";
import {
  createConfigBootstrapPorts,
} from "../src/js/bootstrap/config-bootstrap-ports.js";
import {
  createConfigBootstrapCredentialsPort,
} from "../src/js/bootstrap/config-bootstrap-credentials-port.js";
import {
  createConfigBootstrapDefaultsPort,
} from "../src/js/bootstrap/config-bootstrap-defaults-port.js";
import {
  createConfigBootstrapModelDefaultsPort,
} from "../src/js/bootstrap/config-bootstrap-model-defaults-port.js";
import {
  createConfigBootstrapOcrDefaultsPort,
} from "../src/js/bootstrap/config-bootstrap-ocr-defaults-port.js";
import {
  createConfigBootstrapDeveloperStatePort,
} from "../src/js/bootstrap/config-bootstrap-developer-state-port.js";

test("config bootstrap applies persisted config through ports with defaults", () => {
  const calls = [];
  const ports = createConfigBootstrapPorts({
    applyHiddenCredentialInputs: (credentials) => calls.push(["credentials", credentials]),
    defaultMineruToken: () => "default-mineru",
    defaultModelApiKey: () => "default-model",
    defaultOcrProvider: () => "paddle",
    defaultPaddleToken: () => "default-paddle",
    setDeveloperConfig: (targetState, config) => calls.push(["developer", targetState, config]),
  });
  const targetState = {};

  applyPersistedConfig(targetState, {
    developerConfig: { model: "qwen-test" },
    browserConfig: { modelApiKey: "sk-test" },
  }, ports);

  assert.deepEqual(calls, [
    ["developer", targetState, { model: "qwen-test" }],
    ["credentials", {
      ocrProvider: "paddle",
      mineruToken: "default-mineru",
      paddleToken: "default-paddle",
      modelApiKey: "sk-test",
    }],
  ]);
});

test("config bootstrap hidden credential payload prefers stored values over defaults", () => {
  const ports = {
    defaultMineruToken: () => "default-mineru",
    defaultModelApiKey: () => "default-model",
    defaultOcrProvider: () => "paddle",
    defaultPaddleToken: () => "default-paddle",
  };

  assert.deepEqual(buildHiddenCredentialPayload({
    browserStored: {
      mineruToken: "stored-mineru",
      modelApiKey: "stored-model",
      ocrProvider: "mineru",
      paddleToken: "stored-paddle",
    },
    ports,
  }), {
    mineruToken: "stored-mineru",
    modelApiKey: "stored-model",
    ocrProvider: "mineru",
    paddleToken: "stored-paddle",
  });
  assert.deepEqual(buildHiddenCredentialPayload({ browserStored: {}, ports }), {
    mineruToken: "default-mineru",
    modelApiKey: "default-model",
    ocrProvider: "paddle",
    paddleToken: "default-paddle",
  });
});

test("config bootstrap ports expose grouped defaults credentials and developer state ports", () => {
  const calls = [];
  const modelDefaultsPort = createConfigBootstrapModelDefaultsPort({
    defaultModelApiKey: () => "model-group",
  });
  const ocrDefaultsPort = createConfigBootstrapOcrDefaultsPort({
    defaultMineruToken: () => "mineru-group",
    defaultOcrProvider: () => "mineru",
    defaultPaddleToken: () => "paddle-group",
  });
  const defaultsPort = createConfigBootstrapDefaultsPort({
    modelDefaultsPort,
    ocrDefaultsPort,
  });
  const legacyOverrideDefaultsPort = createConfigBootstrapDefaultsPort({
    defaultModelApiKey: () => "legacy-model-key",
  });
  const credentialsPort = createConfigBootstrapCredentialsPort({
    applyHiddenCredentialInputs: (credentials) => calls.push(["credentials", credentials]),
  });
  const developerStatePort = createConfigBootstrapDeveloperStatePort({
    setDeveloperConfig: (targetState, config) => calls.push(["developer", targetState, config]),
  });
  const ports = createConfigBootstrapPorts({
    credentialsPort,
    defaultsPort,
    developerStatePort,
  });

  assert.equal(ports.credentialsPort, credentialsPort);
  assert.equal(ports.defaultsPort, defaultsPort);
  assert.equal(ports.developerStatePort, developerStatePort);
  assert.equal(defaultsPort.modelDefaultsPort, modelDefaultsPort);
  assert.equal(defaultsPort.ocrDefaultsPort, ocrDefaultsPort);
  assert.equal(ports.defaultMineruToken(), "mineru-group");
  assert.equal(ports.defaultModelApiKey(), "model-group");
  assert.equal(ports.defaultOcrProvider(), "mineru");
  assert.equal(legacyOverrideDefaultsPort.defaultModelApiKey(), "legacy-model-key");
  ports.setDeveloperConfig({ marker: true }, { model: "qwen-test" });
  ports.applyHiddenCredentialInputs({ modelApiKey: "sk-test" });
  assert.deepEqual(calls, [
    ["developer", { marker: true }, { model: "qwen-test" }],
    ["credentials", { modelApiKey: "sk-test" }],
  ]);
});
