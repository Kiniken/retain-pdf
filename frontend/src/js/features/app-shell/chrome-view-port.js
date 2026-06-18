import {
  bindDialogBackdropClose,
  bindInfoBubbles,
  bindUploadTilePicker,
  resetEventsList,
} from "./view.js";

export function createAppShellChromeViewPort({
  bindBackdropClose = bindDialogBackdropClose,
  bindInfoBubbleToggles = bindInfoBubbles,
  bindUploadTile = bindUploadTilePicker,
  resetEvents = resetEventsList,
} = {}) {
  return {
    bindBackdropClose,
    bindInfoBubbleToggles,
    bindUploadTile,
    resetEvents,
  };
}
