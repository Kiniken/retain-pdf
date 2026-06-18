import {
  activateDeveloperTabView,
  bindDeveloperEvents,
  openDeveloperDialogView,
} from "./view.js";

export function createDeveloperViewPort({
  activateTab = activateDeveloperTabView,
  bindEvents = bindDeveloperEvents,
  openDialog = openDeveloperDialogView,
} = {}) {
  return {
    activateTab,
    bindEvents,
    openDialog,
  };
}

