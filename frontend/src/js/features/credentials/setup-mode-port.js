import {
  currentCredentialDialogSetupMode,
} from "./view.js";

export function createCredentialSetupModePort({
  currentSetupMode = currentCredentialDialogSetupMode,
} = {}) {
  return {
    currentSetupMode,
  };
}
