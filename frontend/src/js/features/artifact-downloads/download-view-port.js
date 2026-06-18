import {
  bindProtectedArtifactLinks,
  isActionLinkDisabled,
  setActionLinkBusy,
} from "./view.js";

export function createArtifactDownloadViewPort({
  bindProtectedLinks = bindProtectedArtifactLinks,
  isLinkDisabled = isActionLinkDisabled,
  setLinkBusy = setActionLinkBusy,
} = {}) {
  return {
    bindProtectedLinks,
    isLinkDisabled,
    setLinkBusy,
  };
}
