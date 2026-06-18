import {
  createWorkflowGlossaryDataPort,
} from "./workflow-glossary-data-port.js";
import {
  createWorkflowGlossaryRuntimePort,
} from "./workflow-glossary-runtime-port.js";
import {
  createWorkflowGlossaryUiPort,
} from "./workflow-glossary-ui-port.js";

export function createWorkflowGlossaryMountPort(overrides = {}) {
  const runtimePort = createWorkflowGlossaryRuntimePort(overrides.runtimePort);
  const dataPort = createWorkflowGlossaryDataPort(overrides.dataPort);
  const uiPort = createWorkflowGlossaryUiPort(overrides.uiPort);

  return Object.freeze({
    ...runtimePort,
    ...dataPort,
    ...uiPort,
    runtimePort,
    dataPort,
    uiPort,
    ...overrides,
  });
}
