import { renderJob } from "../ui/presentation.js";

export function createCredentialUiPresentationPort(overrides = {}) {
  return Object.freeze({
    renderJob,
    ...overrides,
  });
}
