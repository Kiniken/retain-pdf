function pickDefined(values) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  );
}

export function createMainEventOverridePorts(overrides = {}) {
  return Object.freeze({
    credentialPersistencePortOverrides: overrides.credentialPersistencePort ?? pickDefined({
      bindCredentialPersistence: overrides.bindCredentialPersistence,
      saveBrowserConfig: overrides.saveBrowserConfig,
    }),
    documentPortOverrides: overrides.documentPort ?? pickDefined({
      documentRef: overrides.documentRef,
    }),
    domPortOverrides: overrides.domPort ?? pickDefined({
      byId: overrides.byId,
    }),
    primaryActionsPortOverrides: overrides.primaryActionsPort ?? pickDefined({
      bindPrimaryActions: overrides.bindPrimaryActions,
    }),
  });
}
