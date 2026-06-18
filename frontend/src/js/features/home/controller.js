import {
  createHomeStatePort,
} from "./state.js";
import { createHomeViewPort } from "./home-view-port.js";

export function mountHomeFeature({
  statePort = createHomeStatePort(),
  viewPort = createHomeViewPort(),
} = {}) {
  function bindEvents() {
    viewPort.bindStateView();
    viewPort.applyViewMode(statePort.getSnapshot().viewMode);
  }

  return {
    bindEvents,
    setViewMode: statePort.setViewMode,
  };
}
