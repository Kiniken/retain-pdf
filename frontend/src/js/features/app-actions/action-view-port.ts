import {
  resetMissingUploadState,
  setSubmitBusy,
  type ResetMissingUploadStateOptions,
} from "./view.js";

export interface CreateAppActionsViewPortOptions {
  setSubmitBusyState?: (busy?: boolean) => void;
  resetMissingUpload?: (options?: ResetMissingUploadStateOptions) => void;
}

export function createAppActionsViewPort({
  setSubmitBusyState = setSubmitBusy,
  resetMissingUpload = resetMissingUploadState,
}: CreateAppActionsViewPortOptions = {}) {
  return {
    resetMissingUpload,
    setSubmitBusyState,
  };
}
