import {
  defaultCredentialsStatePort,
} from "../features/credentials/default-state-port.js";

export function createUploadWorkflowCredentialsStatePort(overrides = {}) {
  return Object.freeze({
    credentialsStatePort: defaultCredentialsStatePort,
    ...overrides,
  });
}
