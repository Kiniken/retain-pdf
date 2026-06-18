import {
  applyDefaultCredentialInputs,
  bindDefaultHiddenCredentialInputPersistence,
  defaultCredentialsStatePort,
} from "./default-state-port.js";
import {
  mirrorCredentialsToHiddenInputs,
  normalizeHiddenCredentialPayload,
  readHiddenCredentialDomInputs,
} from "./hidden-input-dom-port.js";
import {
  credentialOcrToken,
  hasCompleteCredentialInputs,
  readCredentialInputs,
} from "./selectors-port.js";

export { defaultCredentialsStatePort };
export {
  mirrorCredentialsToHiddenInputs,
  normalizeHiddenCredentialPayload,
  readHiddenCredentialDomInputs,
};

export function readHiddenCredentialInputs() {
  return readCredentialInputs(defaultCredentialsStatePort);
}

export function hiddenOcrToken(credentials = readHiddenCredentialInputs(), options = {}) {
  return credentialOcrToken(credentials, options);
}

export function hasCompleteHiddenCredentials(credentials = readHiddenCredentialInputs(), options = {}) {
  return hasCompleteCredentialInputs(credentials, options);
}

export function applyHiddenCredentialInputs(credentialsOrMineruToken, legacyModelApiKey = "") {
  return applyDefaultCredentialInputs(credentialsOrMineruToken, legacyModelApiKey);
}

export function bindHiddenCredentialInputPersistence({ saveBrowserStoredConfig }) {
  bindDefaultHiddenCredentialInputPersistence({ saveBrowserStoredConfig });
}
