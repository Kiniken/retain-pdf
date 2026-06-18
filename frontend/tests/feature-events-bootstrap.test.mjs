import test from "node:test";
import assert from "node:assert/strict";

import {
  createBindFeatureEventsPorts,
} from "../src/js/bootstrap/bind-feature-events-ports.js";
import {
  buildMainEventsBindingPayload,
} from "../src/js/bootstrap/bind-feature-events-payloads.js";
import {
  createBindFeatureEventsDataPort,
} from "../src/js/bootstrap/bind-feature-events-data-port.js";
import {
  createBindFeatureEventsUiPort,
} from "../src/js/bootstrap/bind-feature-events-ui-port.js";
import {
  createBindFeatureEventsMainEventPort,
} from "../src/js/bootstrap/bind-feature-events-main-event-port.js";

test("bind feature events ports can be overridden as one bootstrap dependency group", () => {
  const override = {
    state: { marker: true },
    fetchProtected: async () => ({ ok: true }),
    setText: () => {},
    eventPort: { marker: "main-events" },
  };
  const ports = createBindFeatureEventsPorts(override);

  assert.deepEqual(ports.state, { marker: true });
  assert.equal(ports.fetchProtected, override.fetchProtected);
  assert.equal(ports.setText, override.setText);
  assert.equal(ports.eventPort, override.eventPort);
});

test("bind feature events payload maps feature handles and boundary ports", () => {
  const features = {
    developerFeature: { name: "developer" },
    glossariesFeature: { name: "glossaries" },
    homeFeature: { name: "home" },
    artifactDownloadsFeature: { name: "downloads" },
    statusDetailFeature: { name: "status" },
    appShellFeature: { name: "shell" },
    workflowFeature: { name: "workflow" },
    uploadFeature: { name: "upload" },
    appActionsFeature: { name: "actions" },
    jobRuntimeFeature: { name: "runtime" },
  };
  const ports = {
    state: { marker: "state" },
    fetchProtected: async () => ({ ok: true }),
    setText: () => {},
    eventPort: { marker: "event" },
  };

  const payload = buildMainEventsBindingPayload({ features, ports });

  assert.equal(payload.developerFeature, features.developerFeature);
  assert.equal(payload.glossariesFeature, features.glossariesFeature);
  assert.equal(payload.homeFeature, features.homeFeature);
  assert.equal(payload.artifactDownloadsFeature, features.artifactDownloadsFeature);
  assert.equal(payload.statusDetailFeature, features.statusDetailFeature);
  assert.equal(payload.appShellFeature, features.appShellFeature);
  assert.equal(payload.workflowFeature, features.workflowFeature);
  assert.equal(payload.uploadFeature, features.uploadFeature);
  assert.equal(payload.appActionsFeature, features.appActionsFeature);
  assert.equal(payload.jobRuntimeFeature, features.jobRuntimeFeature);
  assert.equal(payload.state, ports.state);
  assert.equal(payload.fetchProtected, ports.fetchProtected);
  assert.equal(payload.setText, ports.setText);
  assert.equal(payload.eventPort, ports.eventPort);
});

test("bind feature events ports expose grouped data state and ui ports", async () => {
  const dataPort = createBindFeatureEventsDataPort({
    fetchProtected: async () => ({ ok: true }),
  });
  const legacyStatePort = { state: { marker: "events-state" } };
  const uiPort = createBindFeatureEventsUiPort({
    setText: () => {},
  });
  const mainEventPort = createBindFeatureEventsMainEventPort({
    eventPort: { marker: "main-event-port" },
  });
  const ports = createBindFeatureEventsPorts({
    dataPort,
    legacyStatePort,
    mainEventPort,
    uiPort,
  });

  assert.equal(ports.dataPort, dataPort);
  assert.equal(ports.legacyStatePort, legacyStatePort);
  assert.equal(ports.mainEventPort, mainEventPort);
  assert.equal(ports.uiPort, uiPort);
  assert.deepEqual(ports.state, { marker: "events-state" });
  assert.deepEqual(await ports.fetchProtected(), { ok: true });
  assert.deepEqual(ports.eventPort, { marker: "main-event-port" });
  assert.equal(ports.setText, uiPort.setText);
});
