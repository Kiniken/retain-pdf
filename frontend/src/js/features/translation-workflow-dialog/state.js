import { createStore } from "../../app-framework/store.js";
import { HOME_VIEW_MODES } from "../../contracts/home-view-contract.js";
import { TRANSLATION_WORKFLOW_MODES } from "./contract.js";

function normalizeMode(mode = "") {
  return mode === TRANSLATION_WORKFLOW_MODES.STATUS
    ? TRANSLATION_WORKFLOW_MODES.STATUS
    : TRANSLATION_WORKFLOW_MODES.UPLOAD;
}

export function homeViewModeForTranslationWorkflow(mode = TRANSLATION_WORKFLOW_MODES.UPLOAD, open = false) {
  if (!open) {
    return HOME_VIEW_MODES.LIBRARY;
  }
  return normalizeMode(mode) === TRANSLATION_WORKFLOW_MODES.STATUS
    ? HOME_VIEW_MODES.WORKFLOW_STATUS
    : HOME_VIEW_MODES.WORKFLOW_UPLOAD;
}

export function createTranslationWorkflowDialogStore(initialState = {}) {
  return createStore({
    name: "translationWorkflowDialog",
    initialState: {
      open: Boolean(initialState.open),
      mode: normalizeMode(initialState.mode),
    },
    actions: {
      open(currentState, mode = currentState.mode) {
        return {
          ...currentState,
          open: true,
          mode: normalizeMode(mode),
        };
      },
      close(currentState) {
        return {
          ...currentState,
          open: false,
        };
      },
      setMode(currentState, mode = TRANSLATION_WORKFLOW_MODES.UPLOAD) {
        return {
          ...currentState,
          mode: normalizeMode(mode),
        };
      },
    },
  });
}

export function createTranslationWorkflowDialogStatePort({
  homeStatePort = null,
  initialState = {},
} = {}) {
  const store = createTranslationWorkflowDialogStore(initialState);

  function syncHomeMode(snapshot = store.getSnapshot()) {
    homeStatePort?.setViewMode?.(homeViewModeForTranslationWorkflow(snapshot.mode, snapshot.open));
  }

  function getSnapshot() {
    return store.getSnapshot();
  }

  function open(mode) {
    const snapshot = store.actions.open(mode);
    syncHomeMode(snapshot);
    return snapshot;
  }

  function close() {
    const snapshot = store.actions.close();
    syncHomeMode(snapshot);
    return snapshot;
  }

  function setMode(mode) {
    const snapshot = store.actions.setMode(mode);
    syncHomeMode(snapshot);
    return snapshot;
  }

  return {
    close,
    getSnapshot,
    open,
    setMode,
    subscribe: store.subscribe,
    store,
  };
}
