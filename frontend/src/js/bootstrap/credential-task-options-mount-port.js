import {
  saveDeveloperTaskOptions as saveDeveloperTaskOptionsWithDeps,
} from "./credential-task-options-actions.js";
import {
  createCredentialTaskOptionsDefaultsPort,
} from "./credential-task-options-defaults-port.js";

export function saveDeveloperTaskOptions(
  options = {},
  legacyState,
  {
    persistDeveloperConfig,
    defaultsPort,
  } = {},
) {
  const defaults = createCredentialTaskOptionsDefaultsPort({
    ...(defaultsPort || {}),
    ...(legacyState ? { legacyState } : {}),
    ...(persistDeveloperConfig ? { persistDeveloperConfig } : {}),
  });

  return saveDeveloperTaskOptionsWithDeps(options, {
    getDeveloperConfig: defaults.getDeveloperConfig,
    legacyState: defaults.legacyState,
    persistDeveloperConfig: defaults.persistDeveloperConfig,
    setDeveloperConfig: defaults.setDeveloperConfig,
  });
}

export function createCredentialTaskOptionsMountPort(overrides = {}) {
  const defaultsPort = createCredentialTaskOptionsDefaultsPort(overrides.defaultsPort);

  return Object.freeze({
    defaultsPort,
    saveTaskOptions: (options) => saveDeveloperTaskOptions(options, defaultsPort.legacyState, {
      defaultsPort,
    }),
    ...overrides,
  });
}
