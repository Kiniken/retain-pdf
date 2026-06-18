import {
  browserCredentialElements,
  setDeepSeekTopUpVisible,
  setDeepSeekValidationMessage,
} from "./view.js";

export function createDeepSeekCredentialViewPort({
  elements = browserCredentialElements,
  setTopUpVisible = setDeepSeekTopUpVisible,
  setValidationMessage = setDeepSeekValidationMessage,
} = {}) {
  return {
    elements,
    setTopUpVisible,
    setValidationMessage,
  };
}
