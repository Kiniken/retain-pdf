import { createStore } from "../../app-framework/store.js";
import { APP_EVENTS } from "../../contracts/app-contract.js";
import {
  HOME_LOADING_STATES,
  HOME_VIEW_MODES,
} from "../../contracts/home-view-contract.js";

export { HOME_LOADING_STATES, HOME_VIEW_MODES };

function normalizeHomeViewMode(mode) {
  return Object.values(HOME_VIEW_MODES).includes(mode)
    ? mode
    : HOME_VIEW_MODES.LIBRARY;
}

function normalizeHomeLoadingState(loadingState) {
  return Object.values(HOME_LOADING_STATES).includes(loadingState)
    ? loadingState
    : HOME_LOADING_STATES.IDLE;
}

export function createHomeStore(initialState = {}) {
  return createStore({
    name: "home",
    initialState: {
      viewMode: normalizeHomeViewMode(initialState.viewMode
        ?? initialState.homeViewMode
        ?? HOME_VIEW_MODES.LIBRARY),
      recentJobsLoadingState: normalizeHomeLoadingState(initialState.recentJobsLoadingState
        ?? initialState.homeRecentJobsLoadingState
        ?? HOME_LOADING_STATES.IDLE),
      recentJobsError: `${initialState.recentJobsError ?? initialState.homeRecentJobsError ?? ""}`,
    },
    actions: {
      setViewMode(currentState, mode) {
        return {
          ...currentState,
          viewMode: normalizeHomeViewMode(mode),
        };
      },
      setRecentJobsLoadingState(currentState, loadingState, error = "") {
        return {
          ...currentState,
          recentJobsLoadingState: normalizeHomeLoadingState(loadingState),
          recentJobsError: `${error || ""}`,
        };
      },
    },
  });
}

function dispatchHomeEvent(eventTarget, type, detail) {
  if (!eventTarget?.dispatchEvent || typeof globalThis.CustomEvent !== "function") {
    return;
  }
  eventTarget.dispatchEvent(new globalThis.CustomEvent(type, { detail }));
}

export function createHomeStatePort(targetState = {}, {
  eventTarget = globalThis.document,
} = {}) {
  const store = createHomeStore(targetState);

  function applyStoreAction(action) {
    return action();
  }

  function setViewMode(mode) {
    const snapshot = applyStoreAction(() => store.actions.setViewMode(mode));
    dispatchHomeEvent(eventTarget, APP_EVENTS.homeViewModeChanged, {
      mode: snapshot.viewMode,
    });
  }

  function setRecentJobsLoadingState(loadingState, error = "") {
    const snapshot = applyStoreAction(() => store.actions.setRecentJobsLoadingState(loadingState, error));
    dispatchHomeEvent(eventTarget, APP_EVENTS.homeRecentJobsStateChanged, {
      loadingState: snapshot.recentJobsLoadingState,
      error: snapshot.recentJobsError,
    });
  }

  function getSnapshot() {
    return store.getSnapshot();
  }

  return {
    getSnapshot,
    setRecentJobsLoadingState,
    setViewMode,
    store,
  };
}

let defaultHomeStatePort = null;

function getDefaultHomeStatePort() {
  if (!defaultHomeStatePort) {
    defaultHomeStatePort = createHomeStatePort();
  }
  return defaultHomeStatePort;
}

export function setHomeViewMode(mode) {
  getDefaultHomeStatePort().setViewMode(mode);
}

export function setHomeRecentJobsLoadingState(loadingState, error = "") {
  getDefaultHomeStatePort().setRecentJobsLoadingState(loadingState, error);
}

export function getHomeState() {
  return getDefaultHomeStatePort().getSnapshot();
}
