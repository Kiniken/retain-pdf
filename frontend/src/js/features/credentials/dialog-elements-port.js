import {
  browserCredentialElements,
  syncOcrProviderControlsView,
} from "./view.js";

export function createCredentialDialogElementsPort({
  elements = browserCredentialElements,
  syncOcrProviderControls = syncOcrProviderControlsView,
} = {}) {
  return {
    elements,
    syncOcrProviderControls,
  };
}
