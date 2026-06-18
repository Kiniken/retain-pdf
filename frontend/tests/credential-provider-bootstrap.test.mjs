import test from "node:test";
import assert from "node:assert/strict";

import {
  createCredentialActionMountPorts,
} from "../src/js/bootstrap/credential-action-mount-ports.js";
import {
  createCredentialProviderMountPort,
} from "../src/js/bootstrap/credential-provider-mount-port.js";
import {
  validateOcrTokenForProvider,
} from "../src/js/bootstrap/credential-provider-validation-port.js";
import {
  validateOcrTokenForProvider as validateOcrTokenForProviderWithDeps,
} from "../src/js/bootstrap/credential-provider-actions.js";
import {
  createCredentialProviderDataPort,
} from "../src/js/bootstrap/credential-provider-data-port.js";
import {
  createCredentialProviderDeepSeekDataPort,
} from "../src/js/bootstrap/credential-provider-deepseek-data-port.js";
import {
  createCredentialProviderOcrDataPort,
} from "../src/js/bootstrap/credential-provider-ocr-data-port.js";
import {
  createCredentialProviderDefaultsPort,
} from "../src/js/bootstrap/credential-provider-defaults-port.js";
import {
  createCredentialProviderValidationPort,
} from "../src/js/bootstrap/credential-provider-validation-port.js";
import {
  createCredentialProviderValidationDepsPort,
} from "../src/js/bootstrap/credential-provider-validation-deps-port.js";

test("credential action mount OCR validation port selects provider payloads", async () => {
  const calls = [];
  const paddleResult = await validateOcrTokenForProvider("/api", "paddle", "paddle-token", {
    validatePaddle: (...args) => {
      calls.push(["paddle", ...args]);
      return "paddle-ok";
    },
    validateMineru: (...args) => {
      calls.push(["mineru", ...args]);
      return "mineru-ok";
    },
  });
  const mineruResult = await validateOcrTokenForProvider("/api", "mineru", "mineru-token", {
    validatePaddle: (...args) => {
      calls.push(["paddle", ...args]);
      return "paddle-ok";
    },
    validateMineru: (...args) => {
      calls.push(["mineru", ...args]);
      return "mineru-ok";
    },
  });

  assert.equal(paddleResult, "paddle-ok");
  assert.equal(mineruResult, "mineru-ok");
  assert.equal(calls[0][0], "paddle");
  assert.equal(calls[0][1], "/api");
  assert.deepEqual(calls[0][2], {
    paddle_token: "paddle-token",
    base_url: "https://paddleocr.aistudio-app.com",
  });
  assert.equal(calls[1][0], "mineru");
  assert.equal(calls[1][1], "/api");
  assert.equal(calls[1][2].mineru_token, "mineru-token");
});

test("credential provider validation deps preserve legacy override precedence", async () => {
  const calls = [];
  const dataPort = createCredentialProviderDataPort({
    ocrDataPort: createCredentialProviderOcrDataPort({
      validateMineruToken: (...args) => {
        calls.push(["data-mineru", ...args]);
        return "data-mineru";
      },
      validatePaddleToken: (...args) => {
        calls.push(["data-paddle", ...args]);
        return "data-paddle";
      },
    }),
  });
  const defaultsPort = createCredentialProviderDefaultsPort({
    defaultModelVersion: "model-from-defaults",
  });
  const deps = createCredentialProviderValidationDepsPort({
    dataPort,
    defaultsPort,
    defaultModelVersion: "model-from-legacy",
    validateMineru: (...args) => {
      calls.push(["legacy-mineru", ...args]);
      return "legacy-mineru";
    },
    validatePaddle: (...args) => {
      calls.push(["legacy-paddle", ...args]);
      return "legacy-paddle";
    },
  });
  const result = await validateOcrTokenForProvider("/api", "mineru", "token-legacy", {
    dataPort,
    defaultsPort,
    defaultModelVersion: "model-from-legacy-call",
    validateMineru: deps.validateMineru,
    validatePaddle: deps.validatePaddle,
  });

  assert.equal(deps.defaultModelVersion, "model-from-legacy");
  assert.equal(result, "legacy-mineru");
  assert.deepEqual(calls, [[
    "legacy-mineru",
    "/api",
    {
      mineru_token: "token-legacy",
      base_url: "https://mineru.net",
      model_version: "model-from-legacy-call",
    },
  ]]);

  const groupedDeps = createCredentialProviderValidationDepsPort({
    dataPort,
    defaultsPort,
    defaultModelVersion: "",
  });
  assert.equal(groupedDeps.defaultModelVersion, "model-from-defaults");
  assert.equal(await groupedDeps.validatePaddle("/api", {}), "data-paddle");
});

test("credential provider validation port keeps direct override precedence", async () => {
  const validationPort = createCredentialProviderValidationPort({
    validateOcrToken: async () => "validation-override",
  });
  const mountPort = createCredentialProviderMountPort({
    validationPort,
    validateOcrToken: async () => "top-level-override",
  });

  assert.equal(await validationPort.validateOcrToken(), "validation-override");
  assert.equal(await mountPort.validateOcrToken(), "top-level-override");
});

test("credential provider action builds OCR validation payloads from explicit deps", async () => {
  const calls = [];
  const result = await validateOcrTokenForProviderWithDeps("/api", "mineru", "mineru-token", {
    defaultModelVersion: "model-explicit",
    validatePaddle: (...args) => {
      calls.push(["paddle", ...args]);
      return "paddle-ok";
    },
    validateMineru: (...args) => {
      calls.push(["mineru", ...args]);
      return "mineru-ok";
    },
  });

  assert.equal(result, "mineru-ok");
  assert.deepEqual(calls, [[
    "mineru",
    "/api",
    {
      mineru_token: "mineru-token",
      base_url: "https://mineru.net",
      model_version: "model-explicit",
    },
  ]]);
});

test("credential provider mount port groups third party validation APIs", async () => {
  const port = createCredentialProviderMountPort({
    queryDeepSeekBalance: async () => "balance-ok",
    validateDeepSeekToken: async () => "deepseek-ok",
    validateOcrToken: async () => "ocr-ok",
  });
  const ports = createCredentialActionMountPorts({
    providerPort: port,
  });

  assert.equal(ports.providerPort, port);
  assert.equal(await ports.queryDeepSeekBalance(), "balance-ok");
  assert.equal(await ports.validateDeepSeekToken(), "deepseek-ok");
  assert.equal(await ports.validateOcrToken(), "ocr-ok");
});

test("credential provider mount port exposes grouped data and defaults ports", async () => {
  const calls = [];
  const dataPort = createCredentialProviderDataPort({
    deepSeekDataPort: createCredentialProviderDeepSeekDataPort({
      queryDeepSeekBalance: async () => "balance-grouped",
      validateDeepSeekToken: async () => "deepseek-grouped",
    }),
    ocrDataPort: createCredentialProviderOcrDataPort({
      validateMineruToken: async (...args) => {
        calls.push(["mineru", ...args]);
        return "mineru-grouped";
      },
      validatePaddleToken: async (...args) => {
        calls.push(["paddle", ...args]);
        return "paddle-grouped";
      },
    }),
  });
  const legacyOverrideDataPort = createCredentialProviderDataPort({
    queryDeepSeekBalance: async () => "legacy-balance",
    validatePaddleToken: async () => "legacy-paddle",
  });
  const defaultsPort = createCredentialProviderDefaultsPort({
    defaultModelVersion: "model-grouped",
  });
  const validationPort = createCredentialProviderValidationPort();
  const port = createCredentialProviderMountPort({
    dataPort,
    defaultsPort,
    validationPort,
  });

  assert.equal(port.dataPort, dataPort);
  assert.equal(await dataPort.deepSeekDataPort.queryDeepSeekBalance(), "balance-grouped");
  assert.equal(typeof dataPort.ocrDataPort.validatePaddleToken, "function");
  assert.equal(await legacyOverrideDataPort.queryDeepSeekBalance(), "legacy-balance");
  assert.equal(await legacyOverrideDataPort.validatePaddleToken(), "legacy-paddle");
  assert.equal(port.defaultsPort, defaultsPort);
  assert.equal(port.validationPort, validationPort);
  assert.equal(await port.queryDeepSeekBalance(), "balance-grouped");
  assert.equal(await port.validateDeepSeekToken(), "deepseek-grouped");
  assert.equal(await port.validateOcrToken("/api", "mineru", "token-grouped"), "mineru-grouped");
  assert.deepEqual(calls, [[
    "mineru",
    "/api",
    {
      mineru_token: "token-grouped",
      base_url: "https://mineru.net",
      model_version: "model-grouped",
    },
  ]]);
});
