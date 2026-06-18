import {
  activateDetailTabView,
  bindStatusDetailEvents,
  openStatusDetailDialogView,
  readTranslationFilterQuery,
} from "./view.js";

export function createStatusDetailNavigationViewPort({
  activateTab = activateDetailTabView,
  bindEvents = bindStatusDetailEvents,
  openDialog = openStatusDetailDialogView,
  readTranslationFilter = readTranslationFilterQuery,
} = {}) {
  return {
    activateTab,
    bindEvents,
    openDialog,
    readTranslationFilter,
  };
}

