import {
  hasCompleteCredentials,
  ocrTokenFromCredentials,
} from "./state.js";
import { defaultCredentialsStatePort } from "./default-state-port.js";

export function readCredentialInputs(credentialsStatePort = defaultCredentialsStatePort) {
  return credentialsStatePort.getCredentials();
}

export function credentialOcrToken(
  credentials = readCredentialInputs(),
  options = {},
) {
  return ocrTokenFromCredentials(credentials, options);
}

export function hasCompleteCredentialInputs(
  credentials = readCredentialInputs(),
  options = {},
) {
  return hasCompleteCredentials(credentials, options);
}
