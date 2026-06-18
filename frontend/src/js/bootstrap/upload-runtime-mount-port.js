import {
  createUploadRuntimeConfigPort,
} from "./upload-runtime-config-port.js";
import {
  createUploadRuntimeDataPort,
} from "./upload-runtime-data-port.js";
import {
  createUploadRuntimeLegacyStatePort,
} from "./upload-runtime-legacy-state-port.js";
import {
  createUploadRuntimeStatePort,
} from "./upload-runtime-state-port.js";
import {
  createUploadRuntimeUiPort,
} from "./upload-runtime-ui-port.js";

export function createUploadRuntimeMountPort(overrides = {}) {
  const configPort = createUploadRuntimeConfigPort(overrides.configPort);
  const dataPort = createUploadRuntimeDataPort(overrides.dataPort);
  const legacyStatePort = createUploadRuntimeLegacyStatePort(overrides.legacyStatePort);
  const statePort = createUploadRuntimeStatePort(overrides.statePort);
  const uiPort = createUploadRuntimeUiPort(overrides.uiPort);

  return Object.freeze({
    ...configPort,
    ...dataPort,
    ...legacyStatePort,
    ...statePort,
    ...uiPort,
    configPort,
    dataPort,
    legacyStatePort,
    statePort,
    uiPort,
    ...overrides,
  });
}
