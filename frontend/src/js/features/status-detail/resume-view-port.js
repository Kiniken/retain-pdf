import {
  dialogComponent,
  setRerunButtonDisabled,
} from "./view.js";

export function createStatusDetailResumeViewPort({
  closeDialog = () => dialogComponent()?.close?.(),
  setRerunAction = (payload) => dialogComponent()?.setRerunAction?.(payload),
  setRerunDisabled = setRerunButtonDisabled,
} = {}) {
  return {
    closeDialog,
    setRerunAction,
    setRerunDisabled,
  };
}
