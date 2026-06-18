import {
  createWorkflowGlossaryRuntimeConfigPort,
} from "./workflow-glossary-runtime-config-port.js";

export function createWorkflowGlossaryRuntimePort(overrides = {}) {
  const configPort = createWorkflowGlossaryRuntimeConfigPort(overrides.configPort);

  return Object.freeze({
    ...configPort,
    configPort,
    ...overrides,
  });
}
