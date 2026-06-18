import { $ } from "../../dom/query.js";
import { APP_EVENTS } from "../../contracts/app-contract.js";

export function applyHomeViewMode(mode) {
  $("app-shell")?.setAttribute("data-home-view-mode", mode || "library");
}

export function bindHomeStateView() {
  document.addEventListener(APP_EVENTS.homeViewModeChanged, (event) => {
    applyHomeViewMode(event.detail?.mode);
  });
}
