export function createMainEventHiddenCredentialBindingPort(overrides = {}) {
  function bindHiddenCredentialPersistence({
    browserConfigPersistencePort,
    hiddenCredentialPort,
  } = {}) {
    hiddenCredentialPort?.bindCredentialPersistence?.({
      saveBrowserStoredConfig: browserConfigPersistencePort?.saveBrowserConfig,
    });
  }

  return Object.freeze({
    bindHiddenCredentialPersistence,
    ...overrides,
  });
}
