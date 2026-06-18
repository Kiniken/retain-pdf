import test from "node:test";
import assert from "node:assert/strict";

import {
  mountApplicationFeatures,
} from "../src/js/bootstrap/feature-registry.js";
import {
  createFeatureRegistryPorts,
} from "../src/js/bootstrap/feature-registry-ports.js";

test("feature registry wires shared library event port through registry ports", () => {
  const calls = [];
  const libraryEventPort = { publish: () => {} };
  const ports = createFeatureRegistryPorts({
    bindFeatureEvents: (features) => calls.push(["bind", features.libraryEventPort === libraryEventPort]),
    createLibraryEventPort: () => libraryEventPort,
    mountCoreFeatures: (features, options) => {
      calls.push(["core", options.state.marker]);
      features.homeFeature = { marker: "home" };
    },
    mountCredentialAndActionFeatures: (features) => calls.push(["credential", Boolean(features.homeFeature)]),
    mountGlossaryFeature: (features) => calls.push(["glossary", Boolean(features.homeFeature)]),
    mountJobFeatures: (features) => calls.push(["job", Boolean(features.homeFeature)]),
    mountUploadWorkflowFeatures: (features) => calls.push(["upload", Boolean(features.homeFeature)]),
  });
  const features = mountApplicationFeatures({
    ports,
    state: { marker: "registry-state" },
  });

  assert.equal(features.libraryEventPort, libraryEventPort);
  assert.equal(typeof features.checkApiConnectivity, "function");
  assert.deepEqual(calls, [
    ["core", "registry-state"],
    ["upload", true],
    ["glossary", true],
    ["credential", true],
    ["job", true],
    ["bind", true],
  ]);
});
