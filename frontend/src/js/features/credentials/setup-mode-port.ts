import {
  currentCredentialDialogSetupMode,
} from "./view.js";

export function createCredentialSetupModePort({
  currentSetupMode = currentCredentialDialogSetupMode,
}: any = {}) {
  return {
    currentSetupMode,
  };
}
