import {
  createCredentialProviderDeepSeekDataPort,
} from "./credential-provider-deepseek-data-port.js";
import {
  createCredentialProviderOcrDataPort,
} from "./credential-provider-ocr-data-port.js";

export function createCredentialProviderDataPort(overrides = {}) {
  const deepSeekDataPort = createCredentialProviderDeepSeekDataPort(overrides.deepSeekDataPort);
  const ocrDataPort = createCredentialProviderOcrDataPort(overrides.ocrDataPort);

  return Object.freeze({
    ...deepSeekDataPort,
    ...ocrDataPort,
    deepSeekDataPort,
    ocrDataPort,
    ...overrides,
  });
}
