import {
  resolveJobActions,
} from "../job/actions.js";

export function createStatusDetailJobActionResolverPort(overrides = {}) {
  return Object.freeze({
    resolveActions: resolveJobActions,
    ...overrides,
  });
}
