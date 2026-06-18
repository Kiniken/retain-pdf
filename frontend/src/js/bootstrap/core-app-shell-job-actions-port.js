import {
  createCoreAppShellActionButtonsPort,
} from "./core-app-shell-action-buttons-port.js";
import {
  createCoreAppShellFilePickerPort,
} from "./core-app-shell-file-picker-port.js";
import {
  createCoreAppShellProgressPort,
} from "./core-app-shell-progress-port.js";
import {
  createCoreAppShellUploadResetPort,
} from "./core-app-shell-upload-reset-port.js";

export function createCoreAppShellJobActionsPort(overrides = {}) {
  const actionButtonsPort = createCoreAppShellActionButtonsPort(overrides.actionButtonsPort);
  const filePickerPort = createCoreAppShellFilePickerPort(overrides.filePickerPort);
  const progressPort = createCoreAppShellProgressPort(overrides.progressPort);
  const uploadResetPort = createCoreAppShellUploadResetPort(overrides.uploadResetPort);

  return Object.freeze({
    ...actionButtonsPort,
    ...filePickerPort,
    ...progressPort,
    ...uploadResetPort,
    actionButtonsPort,
    filePickerPort,
    progressPort,
    uploadResetPort,
    ...overrides,
  });
}
