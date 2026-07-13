import {
  createCredentialsStatePort,
} from "./state.js";
import {
  bindHiddenCredentialInputPersistence as bindHiddenCredentialDomInputPersistence,
  mirrorCredentialsToHiddenInputs,
  normalizeHiddenCredentialPayload,
  readHiddenCredentialDomInputs,
} from "./hidden-input-dom-port.js";
export const defaultCredentialsStatePort = createCredentialsStatePort({
  initialState: readHiddenCredentialDomInputs(),
  mirrorToDom: mirrorCredentialsToHiddenInputs,
});

export function applyDefaultCredentialInputs(credentialsOrMineruToken, legacyModelApiKey = "") {
  return defaultCredentialsStatePort.setCredentials(
    normalizeHiddenCredentialPayload(credentialsOrMineruToken, legacyModelApiKey),
  );
}

export function bindDefaultHiddenCredentialInputPersistence({ saveBrowserStoredConfig } = {}) {
  bindHiddenCredentialDomInputPersistence({
    credentialsStatePort: defaultCredentialsStatePort,
    readCredentials: defaultCredentialsStatePort.getCredentials,
    saveBrowserStoredConfig,
  });
}
