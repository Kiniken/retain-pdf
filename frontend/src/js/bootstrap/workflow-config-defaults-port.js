import {
  createWorkflowConfigModelDefaultsPort,
} from "./workflow-config-model-defaults-port.js";
import {
  createWorkflowConfigOcrDefaultsPort,
} from "./workflow-config-ocr-defaults-port.js";

export function createWorkflowConfigDefaultsPort(overrides = {}) {
  const modelDefaultsPort = createWorkflowConfigModelDefaultsPort(overrides.modelDefaultsPort);
  const ocrDefaultsPort = createWorkflowConfigOcrDefaultsPort(overrides.ocrDefaultsPort);

  return Object.freeze({
    ...ocrDefaultsPort,
    ...modelDefaultsPort,
    modelDefaultsPort,
    ocrDefaultsPort,
    ...overrides,
  });
}
