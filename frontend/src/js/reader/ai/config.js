import {
  defaultModelApiKey,
  defaultModelBaseUrl,
  defaultModelName,
} from "../../config/runtime.js";
import {
  loadBrowserStoredConfig,
  loadDeveloperStoredConfig,
} from "../../config/persisted-config.js";

export function resolveReaderAiConfig({
  browserConfig = loadBrowserStoredConfig(),
  developerConfig = loadDeveloperStoredConfig(),
} = {}) {
  return {
    apiKey: browserConfig?.modelApiKey || defaultModelApiKey(),
    baseUrl: developerConfig?.baseUrl || defaultModelBaseUrl(),
    model: developerConfig?.model || defaultModelName(),
    provider: "deepseek",
  };
}
