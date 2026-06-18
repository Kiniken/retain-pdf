import test from "node:test";
import assert from "node:assert/strict";

import {
  createCredentialActionMountPorts,
} from "../src/js/bootstrap/credential-action-mount-ports.js";
import {
  createCredentialDesktopMountPort,
} from "../src/js/bootstrap/credential-desktop-mount-port.js";
import {
  createCredentialDesktopConfigPort,
} from "../src/js/bootstrap/credential-desktop-config-port.js";
import {
  createCredentialDesktopRuntimePort,
} from "../src/js/bootstrap/credential-desktop-runtime-port.js";

test("credential desktop mount port groups desktop actions", async () => {
  const calls = [];
  const port = createCredentialDesktopMountPort({
    openDesktopOutputDirectory: async () => calls.push(["open-output"]),
    openSetupDialog: () => calls.push(["setup"]),
    saveDesktopConfig: async () => calls.push(["save-config"]),
  });
  const ports = createCredentialActionMountPorts({
    desktopPort: port,
  });

  assert.equal(ports.desktopPort, port);
  await ports.openDesktopOutputDirectory();
  ports.openSetupDialog();
  await ports.saveDesktopConfig();
  assert.deepEqual(calls, [
    ["open-output"],
    ["setup"],
    ["save-config"],
  ]);
});

test("credential desktop mount port exposes grouped config and runtime ports", async () => {
  const calls = [];
  const configPort = createCredentialDesktopConfigPort({
    openDesktopOutputDirectory: async () => calls.push(["open-output"]),
  });
  const runtimePort = createCredentialDesktopRuntimePort({
    openSetupDialog: () => calls.push(["setup"]),
    saveDesktopConfig: async () => calls.push(["save-config"]),
  });
  const port = createCredentialDesktopMountPort({
    configPort,
    runtimePort,
  });

  assert.equal(port.configPort, configPort);
  assert.equal(port.runtimePort, runtimePort);
  await port.openDesktopOutputDirectory();
  port.openSetupDialog();
  await port.saveDesktopConfig();
  assert.deepEqual(calls, [
    ["open-output"],
    ["setup"],
    ["save-config"],
  ]);
});
