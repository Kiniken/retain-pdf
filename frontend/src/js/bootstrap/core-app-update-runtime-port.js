export function createCoreAppUpdateRuntimePort(overrides = {}) {
  return Object.freeze({
    isAppUpdateEnabled: () => true,
    ...overrides,
  });
}
