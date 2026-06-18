import test from "node:test";
import assert from "node:assert/strict";

import {
  createCredentialActionMountPorts,
} from "../src/js/bootstrap/credential-action-mount-ports.js";
import {
  createCredentialRuntimeMountPort,
} from "../src/js/bootstrap/credential-runtime-mount-port.js";
import {
  createCredentialRuntimeConfigPort,
} from "../src/js/bootstrap/credential-runtime-config-port.js";
import {
  createCredentialRuntimeApiConfigPort,
} from "../src/js/bootstrap/credential-runtime-api-config-port.js";
import {
  createCredentialRuntimeAppActionsConfigPort,
} from "../src/js/bootstrap/credential-runtime-app-actions-config-port.js";
import {
  createCredentialRuntimeDataPort,
} from "../src/js/bootstrap/credential-runtime-data-port.js";
import {
  createCredentialRuntimeHttpPort,
} from "../src/js/bootstrap/credential-runtime-http-port.js";
import {
  createCredentialRuntimeEndpointPort,
} from "../src/js/bootstrap/credential-runtime-endpoint-port.js";
import {
  createCredentialRuntimeProtectedFetchPort,
} from "../src/js/bootstrap/credential-runtime-protected-fetch-port.js";
import {
  createCredentialRuntimeJobsPort,
} from "../src/js/bootstrap/credential-runtime-jobs-port.js";
import {
  createCredentialRuntimeDefaultsPort,
} from "../src/js/bootstrap/credential-runtime-defaults-port.js";
import {
  createCredentialRuntimeModelDefaultsPort,
} from "../src/js/bootstrap/credential-runtime-model-defaults-port.js";
import {
  createCredentialRuntimeOcrDefaultsPort,
} from "../src/js/bootstrap/credential-runtime-ocr-defaults-port.js";
import {
  createCredentialRuntimePersistencePort,
} from "../src/js/bootstrap/credential-runtime-persistence-port.js";

test("credential runtime mount port groups credential defaults and shared APIs", async () => {
  const port = createCredentialRuntimeMountPort({
    apiPrefix: "/runtime/api",
    defaultModelApiKey: () => "runtime-key",
    fetchProtected: async () => "protected-ok",
    submitJobRequest: async () => ({ job_id: "job-runtime" }),
  });
  const ports = createCredentialActionMountPorts({
    runtimePort: port,
  });

  assert.equal(ports.runtimePort, port);
  assert.equal(ports.apiPrefix, "/runtime/api");
  assert.equal(ports.defaultModelApiKey(), "runtime-key");
  assert.equal(await ports.fetchProtected(), "protected-ok");
  assert.deepEqual(await ports.submitJobRequest(), { job_id: "job-runtime" });
});

test("credential runtime mount port exposes grouped config data and defaults ports", async () => {
  const apiConfigPort = createCredentialRuntimeApiConfigPort({
    apiPrefix: "/credential-runtime/api",
  });
  const appActionsConfigPortPort = createCredentialRuntimeAppActionsConfigPort({
    appActionsConfigPort: { apiBaseLabel: () => "runtime-label" },
  });
  const configPort = createCredentialRuntimeConfigPort({
    apiConfigPort,
    appActionsConfigPortPort,
  });
  const correctedOverrideConfigPort = createCredentialRuntimeConfigPort({
    appActionsConfigPort: { apiBaseLabel: () => "corrected-runtime-label" },
  });
  const legacyOverrideConfigPort = createCredentialRuntimeConfigPort({
    apiPrefix: "/legacy-credential-runtime/api",
  });
  const httpPort = createCredentialRuntimeHttpPort({
    endpointPort: createCredentialRuntimeEndpointPort({
      buildApiEndpoint: (path) => `/built${path}`,
    }),
    protectedFetchPort: createCredentialRuntimeProtectedFetchPort({
      fetchProtected: async () => "runtime-protected",
    }),
  });
  const legacyOverrideHttpPort = createCredentialRuntimeHttpPort({
    buildApiEndpoint: (path) => `/legacy-built${path}`,
    fetchProtected: async () => "legacy-runtime-protected",
  });
  const jobsPort = createCredentialRuntimeJobsPort({
    submitJobRequest: async () => ({ job_id: "runtime-grouped" }),
  });
  const dataPort = createCredentialRuntimeDataPort({
    httpPort,
    jobsPort,
  });
  const legacyOverrideDataPort = createCredentialRuntimeDataPort({
    fetchProtected: async () => "legacy-runtime-protected",
  });
  const defaultsPort = createCredentialRuntimeDefaultsPort({
    modelDefaultsPort: createCredentialRuntimeModelDefaultsPort({
      defaultModelApiKey: () => "runtime-default-key",
      defaultModelBaseUrl: () => "https://runtime-model.test",
    }),
    ocrDefaultsPort: createCredentialRuntimeOcrDefaultsPort({
      defaultPaddleToken: () => "runtime-paddle-token",
    }),
    persistencePort: createCredentialRuntimePersistencePort({
      saveBrowserStoredConfig: () => "runtime-saved",
    }),
  });
  const legacyOverrideDefaultsPort = createCredentialRuntimeDefaultsPort({
    defaultModelApiKey: () => "legacy-runtime-key",
  });
  const port = createCredentialRuntimeMountPort({
    configPort,
    dataPort,
    defaultsPort,
  });

  assert.equal(port.configPort, configPort);
  assert.equal(configPort.apiConfigPort, apiConfigPort);
  assert.equal(configPort.appActionsConfigPort.apiBaseLabel(), "runtime-label");
  assert.equal(configPort.appActionsConfigPortPort.appActionsConfigPort.apiBaseLabel(), "runtime-label");
  assert.equal(correctedOverrideConfigPort.appActionsConfigPort.apiBaseLabel(), "corrected-runtime-label");
  assert.equal(correctedOverrideConfigPort.appActionsConfigPortPort.appActionsConfigPort.apiBaseLabel(), "corrected-runtime-label");
  assert.equal(port.dataPort, dataPort);
  assert.equal(dataPort.httpPort, httpPort);
  assert.equal(httpPort.endpointPort.buildApiEndpoint("/health"), "/built/health");
  assert.equal(await httpPort.protectedFetchPort.fetchProtected(), "runtime-protected");
  assert.equal(dataPort.jobsPort, jobsPort);
  assert.equal(legacyOverrideHttpPort.buildApiEndpoint("/health"), "/legacy-built/health");
  assert.equal(await legacyOverrideHttpPort.fetchProtected(), "legacy-runtime-protected");
  assert.equal(await legacyOverrideDataPort.fetchProtected(), "legacy-runtime-protected");
  assert.equal(port.defaultsPort, defaultsPort);
  assert.equal(defaultsPort.modelDefaultsPort.defaultModelBaseUrl(), "https://runtime-model.test");
  assert.equal(defaultsPort.ocrDefaultsPort.defaultPaddleToken(), "runtime-paddle-token");
  assert.equal(defaultsPort.persistencePort.saveBrowserStoredConfig(), "runtime-saved");
  assert.equal(port.apiPrefix, "/credential-runtime/api");
  assert.equal(port.appActionsConfigPort.apiBaseLabel(), "runtime-label");
  assert.equal(legacyOverrideConfigPort.apiPrefix, "/legacy-credential-runtime/api");
  assert.equal(port.buildApiEndpoint("/health"), "/built/health");
  assert.equal(await port.fetchProtected(), "runtime-protected");
  assert.deepEqual(await port.submitJobRequest(), { job_id: "runtime-grouped" });
  assert.equal(port.defaultModelApiKey(), "runtime-default-key");
  assert.equal(legacyOverrideDefaultsPort.defaultModelApiKey(), "legacy-runtime-key");
});
