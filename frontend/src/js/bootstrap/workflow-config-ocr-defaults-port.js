import {
  defaultMineruToken,
  defaultOcrProvider,
  defaultPaddleApiUrl,
  defaultPaddleToken,
} from "../config/runtime.js";

export function createWorkflowConfigOcrDefaultsPort(overrides = {}) {
  return Object.freeze({
    defaultMineruToken,
    defaultOcrProvider,
    defaultPaddleApiUrl,
    defaultPaddleToken,
    ...overrides,
  });
}
