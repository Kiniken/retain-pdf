import {
  browserCredentialElements,
  syncOcrProviderControlsView,
} from "./view.js";

export function createCredentialDialogElementsPort({
  elements = browserCredentialElements,
  syncOcrProviderControls = syncOcrProviderControlsView,
}: any = {}) {
  return {
    elements,
    syncOcrProviderControls,
  };
}
