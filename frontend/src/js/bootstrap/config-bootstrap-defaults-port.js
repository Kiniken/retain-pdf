import {
  createConfigBootstrapModelDefaultsPort,
} from "./config-bootstrap-model-defaults-port.js";
import {
  createConfigBootstrapOcrDefaultsPort,
} from "./config-bootstrap-ocr-defaults-port.js";

export function createConfigBootstrapDefaultsPort(overrides = {}) {
  const modelDefaultsPort = createConfigBootstrapModelDefaultsPort(overrides.modelDefaultsPort);
  const ocrDefaultsPort = createConfigBootstrapOcrDefaultsPort(overrides.ocrDefaultsPort);

  return Object.freeze({
    ...ocrDefaultsPort,
    ...modelDefaultsPort,
    modelDefaultsPort,
    ocrDefaultsPort,
    ...overrides,
  });
}
