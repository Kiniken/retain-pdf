import { normalizeMathMode } from "./workflow-normalizers.js";

export function saveDeveloperTaskOptions(
  options = {},
  {
    getDeveloperConfig,
    legacyState,
    persistDeveloperConfig,
    setDeveloperConfig,
  } = {},
) {
  if (!getDeveloperConfig || !legacyState || !persistDeveloperConfig || !setDeveloperConfig) {
    throw new Error("credential task options dependencies are required");
  }

  const {
    model,
    baseUrl,
    mathMode,
    translateTitles,
  } = options;
  const currentDeveloperConfig = getDeveloperConfig(legacyState);
  setDeveloperConfig(legacyState, {
    ...currentDeveloperConfig,
    model: `${model || ""}`.trim() || currentDeveloperConfig.model,
    baseUrl: `${baseUrl || ""}`.trim() || currentDeveloperConfig.baseUrl,
    mathMode: normalizeMathMode(mathMode),
    translateTitles: translateTitles !== false,
  });
  void persistDeveloperConfig(getDeveloperConfig(legacyState));
}

