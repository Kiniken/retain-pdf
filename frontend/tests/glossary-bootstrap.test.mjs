import test from "node:test";
import assert from "node:assert/strict";

import {
  createGlossaryMountPorts,
} from "../src/js/bootstrap/glossary-mount-ports.js";
import {
  buildGlossaryFeatureMountPayload,
} from "../src/js/bootstrap/glossary-feature-mount-payloads.js";
import {
  mountGlossaryFeature,
} from "../src/js/bootstrap/mount-glossary-feature.js";
import {
  createGlossaryControllerMountPort,
} from "../src/js/bootstrap/glossary-controller-mount-port.js";
import {
  createGlossaryDataMountPort,
} from "../src/js/bootstrap/glossary-data-mount-port.js";
import {
  createGlossaryDataApiPort,
} from "../src/js/bootstrap/glossary-data-api-port.js";
import {
  createGlossaryRuntimeMountPort,
} from "../src/js/bootstrap/glossary-runtime-mount-port.js";
import {
  createGlossaryRuntimeConfigPort,
} from "../src/js/bootstrap/glossary-runtime-config-port.js";

test("glossary mount ports can be overridden as one bootstrap dependency group", () => {
  const override = {
    apiPrefix: "/custom/api",
    fetchGlossaries: async () => ({ items: [] }),
    createGlossary: async () => ({ glossary_id: "g-1" }),
  };
  const ports = createGlossaryMountPorts(override);

  assert.equal(ports.apiPrefix, "/custom/api");
  assert.equal(ports.fetchGlossaries, override.fetchGlossaries);
  assert.equal(ports.createGlossary, override.createGlossary);
  assert.equal(typeof ports.fetchGlossary, "function");
  assert.equal(typeof ports.parseGlossaryCsv, "function");
});

test("glossary mount ports expose grouped runtime and data ports", async () => {
  const controllerPort = createGlossaryControllerMountPort({
    mountGlossariesFeature: () => ({ name: "glossaries" }),
  });
  const configPort = createGlossaryRuntimeConfigPort({
    apiPrefix: "/glossary/api",
  });
  const runtimePort = createGlossaryRuntimeMountPort({
    configPort,
  });
  const legacyOverrideRuntimePort = createGlossaryRuntimeMountPort({
    apiPrefix: "/legacy-glossary/api",
  });
  const dataPort = createGlossaryDataMountPort({
    createGlossary: async () => ({ glossary_id: "g-data" }),
    fetchGlossaries: async () => ({ items: ["g-data"] }),
  });
  const apiPort = createGlossaryDataApiPort({
    fetchGlossary: async () => ({ glossary_id: "g-api" }),
  });
  const groupedDataPort = createGlossaryDataMountPort({
    apiPort,
  });
  const legacyOverrideDataPort = createGlossaryDataMountPort({
    fetchGlossary: async () => ({ glossary_id: "g-legacy" }),
  });
  const ports = createGlossaryMountPorts({
    controllerPort,
    dataPort,
    runtimePort,
  });

  assert.equal(ports.controllerPort, controllerPort);
  assert.equal(ports.dataPort, dataPort);
  assert.equal(ports.runtimePort, runtimePort);
  assert.deepEqual(ports.mountGlossariesFeature(), { name: "glossaries" });
  assert.equal(runtimePort.configPort, configPort);
  assert.equal(legacyOverrideRuntimePort.apiPrefix, "/legacy-glossary/api");
  assert.equal(groupedDataPort.apiPort, apiPort);
  assert.equal(ports.apiPrefix, "/glossary/api");
  assert.deepEqual(await ports.createGlossary(), { glossary_id: "g-data" });
  assert.deepEqual(await ports.fetchGlossaries(), { items: ["g-data"] });
  assert.deepEqual(await groupedDataPort.fetchGlossary(), { glossary_id: "g-api" });
  assert.deepEqual(await legacyOverrideDataPort.fetchGlossary(), { glossary_id: "g-legacy" });
});

test("glossary feature mount payload preserves delayed workflow refresh callback", () => {
  const calls = [];
  const ports = {
    apiPrefix: "/api",
    createGlossary: async () => ({ glossary_id: "created" }),
    deleteGlossary: async () => ({ ok: true }),
    exportGlossaryCsv: () => "csv",
    fetchGlossaries: async () => ({ items: [] }),
    fetchGlossary: async () => ({ glossary_id: "g1" }),
    mountGlossariesFeature: (payload) => {
      calls.push(["mount-glossary"]);
      return { payload };
    },
    parseGlossaryCsv: async () => [],
    updateGlossary: async () => ({ glossary_id: "updated" }),
  };
  const workflowPorts = {
    loadGlossaryOptions: () => "loaded",
  };
  const directPayload = buildGlossaryFeatureMountPayload({ ports, workflowPorts });
  const features = {
    workflowFeature: {
      loadGlossaryOptions: (options) => {
        calls.push(["load-glossary", options.source]);
        return "mounted-loaded";
      },
    },
  };

  assert.equal(directPayload.refreshWorkflowGlossaries(), "loaded");
  mountGlossaryFeature(features, ports);
  assert.equal(features.glossariesFeature.payload.apiPrefix, "/api");
  assert.equal(features.glossariesFeature.payload.createGlossary, ports.createGlossary);
  assert.equal(
    features.glossariesFeature.payload.refreshWorkflowGlossaries({ source: "dialog" }),
    "mounted-loaded",
  );
  assert.deepEqual(calls, [
    ["mount-glossary"],
    ["load-glossary", "dialog"],
  ]);
});
