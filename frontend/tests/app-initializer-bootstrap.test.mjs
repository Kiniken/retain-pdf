import test from "node:test";
import assert from "node:assert/strict";

import {
  createAppInitializerPorts,
} from "../src/js/bootstrap/app-initializer-ports.js";
import {
  createAppInitializerDataPort,
} from "../src/js/bootstrap/app-initializer-data-port.js";
import {
  createAppInitializerDataHttpPort,
} from "../src/js/bootstrap/app-initializer-data-http-port.js";
import {
  createAppInitializerDataJobsPort,
} from "../src/js/bootstrap/app-initializer-data-jobs-port.js";
import {
  createAppInitializerFeaturePort,
} from "../src/js/bootstrap/app-initializer-feature-port.js";
import {
  createAppInitializerRuntimePort,
} from "../src/js/bootstrap/app-initializer-runtime-port.js";
import {
  createAppInitializerConfigPort,
} from "../src/js/bootstrap/app-initializer-config-port.js";
import {
  createAppInitializerEnvironmentPort,
} from "../src/js/bootstrap/app-initializer-environment-port.js";
import {
  createAppInitializerPersistedConfigPort,
} from "../src/js/bootstrap/app-initializer-persisted-config-port.js";
import {
  createAppInitializerDesktopPort,
} from "../src/js/bootstrap/app-initializer-desktop-port.js";
import {
  createAppInitializerUiPort,
} from "../src/js/bootstrap/app-initializer-ui-port.js";
import {
  createConfigBootstrapPorts,
} from "../src/js/bootstrap/config-bootstrap-ports.js";
import {
  createStartupRoutePorts,
} from "../src/js/bootstrap/startup-route-ports.js";

test("app initializer ports can be overridden as one bootstrap dependency group", () => {
  const override = {
    state: { marker: true },
    loadPersistedConfig: async () => ({ browserConfig: {} }),
    mountApplicationFeatures: () => ({ workflowFeature: {} }),
    setText: () => {},
  };
  const ports = createAppInitializerPorts(override);

  assert.deepEqual(ports.state, { marker: true });
  assert.equal(ports.loadPersistedConfig, override.loadPersistedConfig);
  assert.equal(ports.mountApplicationFeatures, override.mountApplicationFeatures);
  assert.equal(ports.setText, override.setText);
  assert.equal(typeof ports.fetchProtected, "function");
  assert.equal(typeof ports.fetchJobPayload, "function");
});

test("app initializer ports expose grouped runtime data feature and ui ports", async () => {
  const httpPort = createAppInitializerDataHttpPort({
    fetchProtected: async () => ({ ok: true }),
  });
  const jobsPort = createAppInitializerDataJobsPort({
    fetchJobPayload: async () => ({ job_id: "job-init" }),
  });
  const dataPort = createAppInitializerDataPort({
    httpPort,
    jobsPort,
  });
  const legacyOverrideDataPort = createAppInitializerDataPort({
    fetchJobPayload: async () => ({ job_id: "legacy-job-init" }),
  });
  const featurePort = createAppInitializerFeaturePort({
    mountApplicationFeatures: () => ({ workflowFeature: { marker: "workflow" } }),
  });
  const environmentPort = createAppInitializerEnvironmentPort({
    desktopMode: () => true,
  });
  const persistedConfigPort = createAppInitializerPersistedConfigPort({
    loadPersistedConfig: async () => ({ browserConfig: { marker: true } }),
  });
  const configBootstrapPort = createConfigBootstrapPorts({
    setDeveloperConfig: () => "developer-configured",
    applyHiddenCredentialInputs: () => "hidden-credentials-applied",
  });
  const configPort = createAppInitializerConfigPort({
    environmentPort,
    persistedConfigPort,
    configBootstrapPort,
  });
  const legacyOverrideConfigPort = createAppInitializerConfigPort({
    desktopMode: () => false,
  });
  const desktopPort = createAppInitializerDesktopPort({
    bootstrapDesktop: async () => ({ desktop: true }),
  });
  const runtimePort = createAppInitializerRuntimePort({
    configPort,
    desktopPort,
  });
  const legacyOverrideRuntimePort = createAppInitializerRuntimePort({
    desktopMode: () => false,
  });
  const uiPort = createAppInitializerUiPort({
    setText: () => {},
  });
  const startupRoutePort = createStartupRoutePorts({
    createHomeStatePort: () => ({ kind: "home-init" }),
    createRecentJobsStatePort: () => ({ kind: "recent-init" }),
    mountRecentJobsFeature: () => ({ kind: "recent-feature-init" }),
  });
  const ports = createAppInitializerPorts({
    dataPort,
    featurePort,
    runtimePort,
    startupRoutePort,
    uiPort,
  });

  assert.equal(ports.dataPort, dataPort);
  assert.equal(dataPort.httpPort, httpPort);
  assert.equal(dataPort.jobsPort, jobsPort);
  assert.deepEqual(await legacyOverrideDataPort.fetchJobPayload(), { job_id: "legacy-job-init" });
  assert.equal(ports.featurePort, featurePort);
  assert.equal(ports.runtimePort, runtimePort);
  assert.equal(ports.startupRoutePort, startupRoutePort);
  assert.equal(runtimePort.configPort, configPort);
  assert.equal(configPort.environmentPort, environmentPort);
  assert.equal(configPort.persistedConfigPort, persistedConfigPort);
  assert.equal(configPort.configBootstrapPort, configBootstrapPort);
  assert.equal(runtimePort.desktopPort, desktopPort);
  assert.equal(legacyOverrideConfigPort.desktopMode(), false);
  assert.equal(legacyOverrideRuntimePort.desktopMode(), false);
  assert.equal(ports.uiPort, uiPort);
  assert.equal(ports.desktopMode(), true);
  assert.deepEqual(await ports.loadPersistedConfig(), { browserConfig: { marker: true } });
  assert.equal(ports.setDeveloperConfig(), "developer-configured");
  assert.equal(ports.applyHiddenCredentialInputs(), "hidden-credentials-applied");
  assert.deepEqual(ports.createHomeStatePort(), { kind: "home-init" });
  assert.deepEqual(ports.createRecentJobsStatePort(), { kind: "recent-init" });
  assert.deepEqual(ports.mountRecentJobsFeature(), { kind: "recent-feature-init" });
  assert.deepEqual(await ports.bootstrapDesktop(), { desktop: true });
  assert.deepEqual(await ports.fetchJobPayload(), { job_id: "job-init" });
  assert.deepEqual(await ports.fetchProtected(), { ok: true });
  assert.deepEqual(ports.mountApplicationFeatures(), { workflowFeature: { marker: "workflow" } });
  assert.equal(ports.setText, uiPort.setText);
});
