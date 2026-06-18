import {
  bindUpdateButton,
  setUpdateAvailable,
  setUpdateChecking,
  setUpdateError,
  setUpdateLatest,
  setUpdateReady,
} from "./view.js";

export function createAppUpdateViewPort({
  bindButton = bindUpdateButton,
  setAvailable = setUpdateAvailable,
  setChecking = setUpdateChecking,
  setError = setUpdateError,
  setLatest = setUpdateLatest,
  setReady = setUpdateReady,
} = {}) {
  return {
    bindButton,
    setAvailable,
    setChecking,
    setError,
    setLatest,
    setReady,
  };
}

