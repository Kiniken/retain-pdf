import {
  setUploadActionSlotVisible,
  setUploadTileLocked,
  setUploadTileReady,
  setUploadTileText,
} from "../ui/upload-tile-view-port.js";

export function createUploadTileUiPort(overrides = {}) {
  return Object.freeze({
    setUploadActionSlotVisible,
    setUploadTileLocked,
    setUploadTileReady,
    setUploadTileText,
    ...overrides,
  });
}
