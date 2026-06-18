import {
  createWorkflowViewPort,
} from "../features/workflow/workflow-view-port.js";
import {
  createUploadTileUiPort,
} from "./upload-tile-ui-port.js";

export function createWorkflowViewMountPort(overrides = {}) {
  const uploadTilePort = overrides.uploadTilePort || createUploadTileUiPort();
  return Object.freeze({
    uploadTilePort,
    workflowViewPort: createWorkflowViewPort({
      uploadTilePort,
      ...overrides.viewPort,
    }),
    ...overrides,
  });
}
