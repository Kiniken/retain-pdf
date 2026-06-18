import {
  createWorkflowConfigDefaultsPort,
} from "./workflow-config-defaults-port.js";
import {
  createWorkflowConfigRuntimePort,
} from "./workflow-config-runtime-port.js";
import {
  createWorkflowConfigStatePort,
} from "./workflow-config-state-port.js";

export function createWorkflowConfigMountPort(overrides = {}) {
  const defaultsPort = createWorkflowConfigDefaultsPort(overrides.defaultsPort);
  const runtimePort = createWorkflowConfigRuntimePort(overrides.runtimePort);
  const statePort = createWorkflowConfigStatePort(overrides.statePort);

  return Object.freeze({
    ...defaultsPort,
    ...runtimePort,
    ...statePort,
    defaultsPort,
    runtimePort,
    statePort,
    ...overrides,
  });
}
