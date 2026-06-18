import {
  createUploadRuntimeDefaultsPort,
} from "./upload-runtime-defaults-port.js";
import {
  createUploadRuntimeRuntimePort,
} from "./upload-runtime-leaf-ports.js";

export function createUploadRuntimeConfigPort(overrides = {}) {
  const defaultsPort = createUploadRuntimeDefaultsPort(overrides.defaultsPort);
  const runtimePort = createUploadRuntimeRuntimePort(overrides.runtimePort);

  return Object.freeze({
    ...runtimePort,
    ...defaultsPort,
    runtimePort,
    defaultsPort,
    ...overrides,
  });
}
