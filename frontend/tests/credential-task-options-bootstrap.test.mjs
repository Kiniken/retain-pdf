import test from "node:test";
import assert from "node:assert/strict";

import {
  createCredentialActionMountPorts,
} from "../src/js/bootstrap/credential-action-mount-ports.js";
import {
  createCredentialTaskOptionsMountPort,
  saveDeveloperTaskOptions,
} from "../src/js/bootstrap/credential-task-options-mount-port.js";
import {
  createCredentialTaskOptionsDefaultsPort,
} from "../src/js/bootstrap/credential-task-options-defaults-port.js";
import {
  createCredentialTaskOptionsDeveloperStatePort,
} from "../src/js/bootstrap/credential-task-options-developer-state-port.js";
import {
  createCredentialTaskOptionsLegacyStatePort,
} from "../src/js/bootstrap/credential-task-options-legacy-state-port.js";
import {
  createCredentialTaskOptionsPersistencePort,
} from "../src/js/bootstrap/credential-task-options-persistence-port.js";
import {
  saveDeveloperTaskOptions as saveDeveloperTaskOptionsWithDeps,
} from "../src/js/bootstrap/credential-task-options-actions.js";
import { createInitialState } from "../src/js/state/slices.js";
import { getDeveloperConfig } from "../src/js/state/developer-state.js";

test("credential action mount task options mirror into developer state", () => {
  const state = createInitialState();
  saveDeveloperTaskOptions({
    model: " qwen-test ",
    baseUrl: " http://model.test/v1 ",
    mathMode: "auto",
    translateTitles: false,
  }, state, {
    persistDeveloperConfig: () => {},
  });

  const developerConfig = getDeveloperConfig(state);
  assert.equal(developerConfig.model, "qwen-test");
  assert.equal(developerConfig.baseUrl, "http://model.test/v1");
  assert.equal(developerConfig.mathMode, "direct_typst");
  assert.equal(developerConfig.translateTitles, false);
});

test("credential task options action owns developer option merge with explicit deps", () => {
  const calls = [];
  const legacyState = { marker: true };

  saveDeveloperTaskOptionsWithDeps({
    model: " qwen-action ",
    baseUrl: " http://action.test/v1 ",
    mathMode: "auto",
  }, {
    legacyState,
    getDeveloperConfig: () => ({
      model: "old-model",
      baseUrl: "old-url",
      mathMode: "text",
      translateTitles: false,
    }),
    setDeveloperConfig: (target, nextConfig) => {
      calls.push(["set", target, nextConfig]);
    },
    persistDeveloperConfig: (nextConfig) => {
      calls.push(["persist", nextConfig]);
    },
  });

  assert.deepEqual(calls, [
    ["set", legacyState, {
      model: "qwen-action",
      baseUrl: "http://action.test/v1",
      mathMode: "direct_typst",
      translateTitles: true,
    }],
    ["persist", {
      model: "old-model",
      baseUrl: "old-url",
      mathMode: "text",
      translateTitles: false,
    }],
  ]);
});

test("credential task options mount port uses grouped default dependencies", () => {
  const calls = [];
  const legacyState = { marker: "task-options" };
  const developerStatePort = createCredentialTaskOptionsDeveloperStatePort({
    getDeveloperConfig: () => ({
      model: "old-model",
      baseUrl: "old-url",
      mathMode: "text",
      translateTitles: true,
    }),
    setDeveloperConfig: (target, nextConfig) => {
      calls.push(["set", target, nextConfig]);
    },
  });
  const legacyStatePort = createCredentialTaskOptionsLegacyStatePort({
    legacyState,
  });
  const persistencePort = createCredentialTaskOptionsPersistencePort({
    persistDeveloperConfig: (nextConfig) => {
      calls.push(["persist", nextConfig]);
    },
  });
  const defaultsPort = createCredentialTaskOptionsDefaultsPort({
    developerStatePort,
    legacyStatePort,
    persistencePort,
  });
  const legacyOverrideDefaultsPort = createCredentialTaskOptionsDefaultsPort({
    getDeveloperConfig: () => ({ model: "legacy" }),
  });
  const port = createCredentialTaskOptionsMountPort({ defaultsPort });

  assert.equal(port.defaultsPort, defaultsPort);
  assert.equal(defaultsPort.developerStatePort, developerStatePort);
  assert.equal(defaultsPort.legacyStatePort, legacyStatePort);
  assert.equal(defaultsPort.persistencePort, persistencePort);
  assert.deepEqual(legacyOverrideDefaultsPort.getDeveloperConfig(), { model: "legacy" });
  port.saveTaskOptions({
    model: " qwen-port ",
    baseUrl: " http://port.test/v1 ",
    mathMode: "auto",
    translateTitles: false,
  });

  assert.deepEqual(calls, [
    ["set", legacyState, {
      model: "qwen-port",
      baseUrl: "http://port.test/v1",
      mathMode: "direct_typst",
      translateTitles: false,
    }],
    ["persist", {
      model: "old-model",
      baseUrl: "old-url",
      mathMode: "text",
      translateTitles: true,
    }],
  ]);
});

test("credential task options mount port can be grouped into credential action ports", () => {
  const calls = [];
  const port = createCredentialTaskOptionsMountPort({
    saveTaskOptions: (options) => calls.push(options),
  });
  const ports = createCredentialActionMountPorts({
    taskOptionsPort: port,
  });

  assert.equal(ports.taskOptionsPort, port);
  ports.saveTaskOptions({ model: "qwen-test" });
  assert.deepEqual(calls, [{ model: "qwen-test" }]);
});
