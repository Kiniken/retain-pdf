import {
  defaultMineruToken,
  defaultOcrProvider,
  defaultPaddleToken,
} from "../config/runtime.js";

export function createConfigBootstrapOcrDefaultsPort(overrides = {}) {
  return Object.freeze({
    defaultMineruToken,
    defaultOcrProvider,
    defaultPaddleToken,
    ...overrides,
  });
}
