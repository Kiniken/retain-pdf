import {
  resetMissingUploadState,
  setSubmitBusy,
} from "./view.js";

export function createAppActionsViewPort({
  setSubmitBusyState = setSubmitBusy,
  resetMissingUpload = resetMissingUploadState,
} = {}) {
  return {
    resetMissingUpload,
    setSubmitBusyState,
  };
}

