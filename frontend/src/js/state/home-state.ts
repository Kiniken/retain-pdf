import {
  HOME_LOADING_STATES,
  HOME_VIEW_MODES,
} from "../contracts/home-view-contract.js";

export function createHomeState() {
  return {
    homeViewMode: HOME_VIEW_MODES.LIBRARY,
    homeRecentJobsLoadingState: HOME_LOADING_STATES.IDLE,
    homeRecentJobsError: "",
    lastLibraryRefreshRequestedAt: 0,
  };
}

export function setHomeViewMode(target, mode) {
  target.homeViewMode = Object.values(HOME_VIEW_MODES).includes(mode)
    ? mode
    : HOME_VIEW_MODES.LIBRARY;
}

export function setHomeRecentJobsLoadingState(target, loadingState, error = "") {
  target.homeRecentJobsLoadingState = Object.values(HOME_LOADING_STATES).includes(loadingState)
    ? loadingState
    : HOME_LOADING_STATES.IDLE;
  target.homeRecentJobsError = `${error || ""}`;
}
