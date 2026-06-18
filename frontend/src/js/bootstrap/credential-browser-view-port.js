import {
  createBrowserCredentialViewPort,
} from "../features/credentials/browser-view-port.js";
import {
  createUploadTileUiPort,
} from "./upload-tile-ui-port.js";

export function createCredentialBrowserViewPort(overrides = {}) {
  const uploadTilePort = overrides.uploadTilePort || createUploadTileUiPort();
  return createBrowserCredentialViewPort({
    uploadTilePort,
    ...overrides,
  });
}
