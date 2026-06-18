import { createStore } from "../../app-framework/store.js";

function createUploadState() {
  return {
    uploadId: "",
    uploadedFileName: "",
    uploadedPageCount: 0,
    uploadedBytes: 0,
    appliedPageRange: "",
    submitBusy: false,
  };
}

function readUploadState(target = {}) {
  return {
    uploadId: target.uploadId,
    uploadedFileName: target.uploadedFileName,
    uploadedPageCount: target.uploadedPageCount,
    uploadedBytes: target.uploadedBytes,
    appliedPageRange: target.appliedPageRange,
    submitBusy: target.submitBusy,
  };
}

function resetUploadSnapshot(currentState, { includePageRange = true } = {}) {
  const next = createUploadState();
  if (!includePageRange) {
    next.appliedPageRange = currentState.appliedPageRange;
  }
  return next;
}

function setUploadSnapshot(currentState, {
  uploadId = "",
  uploadedFileName = "",
  uploadedPageCount = 0,
  uploadedBytes = 0,
} = {}) {
  return {
    ...currentState,
    uploadId,
    uploadedFileName,
    uploadedPageCount,
    uploadedBytes,
  };
}

function setAppliedPageRangeSnapshot(currentState, value = "") {
  return {
    ...currentState,
    appliedPageRange: `${value || ""}`.trim(),
  };
}

export function createUploadStore(initialState = {}) {
  const legacySnapshot = readUploadState(initialState);
  const initialUploadState = {
    ...createUploadState(),
    ...Object.fromEntries(
      Object.entries(legacySnapshot).filter(([, value]) => value !== undefined),
    ),
  };
  return createStore({
    name: "upload",
    initialState: initialUploadState,
    actions: {
      reset(currentState, options = {}) {
        return resetUploadSnapshot(currentState, options);
      },
      setUpload(currentState, payload = {}) {
        return setUploadSnapshot(currentState, payload);
      },
      setAppliedPageRange(currentState, value = "") {
        return setAppliedPageRangeSnapshot(currentState, value);
      },
      clearAppliedPageRange(currentState) {
        return setAppliedPageRangeSnapshot(currentState, "");
      },
      setSubmitBusy(currentState, busy = false) {
        return {
          ...currentState,
          submitBusy: !!busy,
        };
      },
    },
  });
}

function syncLegacyUploadState(targetState, snapshot) {
  if (!targetState) {
    return;
  }
  Object.assign(targetState, {
    uploadId: snapshot.uploadId,
    uploadedFileName: snapshot.uploadedFileName,
    uploadedPageCount: snapshot.uploadedPageCount,
    uploadedBytes: snapshot.uploadedBytes,
    appliedPageRange: snapshot.appliedPageRange,
    submitBusy: snapshot.submitBusy,
  });
}

export function createUploadStatePort(targetState = {}) {
  const store = createUploadStore(targetState);
  syncLegacyUploadState(targetState, store.getSnapshot());

  function applyStoreAction(action) {
    const snapshot = action();
    syncLegacyUploadState(targetState, snapshot);
    return snapshot;
  }

  function getSnapshot() {
    return store.getSnapshot();
  }

  function reset(options = {}) {
    return applyStoreAction(() => store.actions.reset(options));
  }

  function setUpload(payload = {}) {
    return applyStoreAction(() => store.actions.setUpload(payload));
  }

  function setAppliedPageRange(value = "") {
    return applyStoreAction(() => store.actions.setAppliedPageRange(value));
  }

  function clearAppliedPageRange() {
    return applyStoreAction(() => store.actions.clearAppliedPageRange());
  }

  function setSubmitBusy(busy = false) {
    return applyStoreAction(() => store.actions.setSubmitBusy(busy));
  }

  return {
    clearAppliedPageRange,
    getSnapshot,
    reset,
    setAppliedPageRange,
    setSubmitBusy,
    setUpload,
    subscribe: store.subscribe,
    store,
  };
}

let defaultUploadStatePort = null;

function getDefaultUploadStatePort() {
  if (!defaultUploadStatePort) {
    defaultUploadStatePort = createUploadStatePort();
  }
  return defaultUploadStatePort;
}

export function getUploadState() {
  return getDefaultUploadStatePort().getSnapshot();
}

export function resetUploadState(options = {}) {
  return getDefaultUploadStatePort().reset(options);
}

export function setUploadState(payload = {}) {
  return getDefaultUploadStatePort().setUpload(payload);
}

export function setAppliedPageRange(value = "") {
  return getDefaultUploadStatePort().setAppliedPageRange(value);
}

export function clearAppliedPageRange() {
  return getDefaultUploadStatePort().clearAppliedPageRange();
}

export function setUploadSubmitBusy(busy = false) {
  return getDefaultUploadStatePort().setSubmitBusy(busy);
}
