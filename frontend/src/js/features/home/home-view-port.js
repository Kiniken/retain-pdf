import {
  applyHomeViewMode,
  bindHomeStateView,
} from "./view.js";

export function createHomeViewPort({
  applyViewMode = applyHomeViewMode,
  bindStateView = bindHomeStateView,
} = {}) {
  return {
    applyViewMode,
    bindStateView,
  };
}

