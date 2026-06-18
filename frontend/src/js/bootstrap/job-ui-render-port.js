import {
  renderJob,
  renderJobSecondaryPatch,
} from "../ui/presentation.js";

export function createJobUiRenderPort(overrides = {}) {
  return Object.freeze({
    renderJob,
    renderJobSecondaryPatch,
    ...overrides,
  });
}
