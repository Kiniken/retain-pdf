import { createStore } from "../../app-framework/store.js";
export {
  currentJobEventsFor,
  currentJobManifest,
  currentJobStageActions,
} from "./current-job-secondary-selectors.js";
import {
  createLegacyCurrentJobStatePort,
} from "./legacy-current-job-state-port.js";

const CURRENT_JOB_STORE_KEY = Symbol.for("retainpdf.currentJobStore");

export function createCurrentJobStore(initialState = {}) {
  return createStore({
    name: "currentJob",
    initialState: {
      jobId: `${initialState.jobId ?? initialState.currentJobId ?? ""}`.trim(),
      snapshot: initialState.snapshot ?? initialState.currentJobSnapshot ?? null,
      startedAt: `${initialState.startedAt ?? initialState.currentJobStartedAt ?? ""}`.trim(),
      finishedAt: `${initialState.finishedAt ?? initialState.currentJobFinishedAt ?? ""}`.trim(),
      diagnostics: initialState.diagnostics ?? initialState.currentJobDiagnostics ?? null,
      diagnosticsJobId: `${initialState.diagnosticsJobId ?? initialState.currentJobDiagnosticsJobId ?? ""}`.trim(),
      resumePlan: initialState.resumePlan ?? initialState.currentJobResumePlan ?? null,
      resumePlanJobId: `${initialState.resumePlanJobId ?? initialState.currentJobResumePlanJobId ?? ""}`.trim(),
    },
    actions: {
      syncSnapshot(currentState, job, jobId, meta = {}) {
        return {
          ...currentState,
          jobId: `${jobId || ""}`.trim(),
          snapshot: job || null,
          startedAt: `${meta.startedAt || ""}`.trim(),
          finishedAt: `${meta.finishedAt || ""}`.trim(),
        };
      },
      clearTiming(currentState) {
        return {
          ...currentState,
          startedAt: "",
          finishedAt: "",
        };
      },
      cacheDiagnostics(currentState, jobId, payload) {
        return {
          ...currentState,
          diagnostics: payload,
          diagnosticsJobId: `${jobId || ""}`.trim(),
        };
      },
      cacheResumePlan(currentState, jobId, payload) {
        return {
          ...currentState,
          resumePlan: payload,
          resumePlanJobId: `${jobId || ""}`.trim(),
        };
      },
    },
  });
}

export function currentJobStoreFor(state) {
  if (!state || typeof state !== "object") {
    return createCurrentJobStore();
  }
  if (!state[CURRENT_JOB_STORE_KEY]) {
    Object.defineProperty(state, CURRENT_JOB_STORE_KEY, {
      configurable: false,
      enumerable: false,
      value: createCurrentJobStore(state),
      writable: false,
    });
  }
  return state[CURRENT_JOB_STORE_KEY];
}

function defaultMirrorPortFor(state) {
  return createLegacyCurrentJobStatePort(state);
}

function syncMirrorPort(mirrorPort, snapshot) {
  mirrorPort?.sync?.(snapshot);
}

function applyCurrentJobAction(state, action, mirrorPort = defaultMirrorPortFor(state)) {
  const store = currentJobStoreFor(state);
  const snapshot = action(store);
  syncMirrorPort(mirrorPort, snapshot);
  return snapshot;
}

export function createCurrentJobStatePort(state, {
  mirrorPort = defaultMirrorPortFor(state),
} = {}) {
  const store = currentJobStoreFor(state);
  syncMirrorPort(mirrorPort, store.getSnapshot());
  function applyBatch(callback) {
    if (typeof callback !== "function") {
      return store.getSnapshot();
    }
    const result = store.batch(({ actions }) => callback({
      actions,
      cacheDiagnostics: actions.cacheDiagnostics,
      cacheResumePlan: actions.cacheResumePlan,
      clearTiming: actions.clearTiming,
      getSnapshot: () => store.getSnapshot(),
      syncSnapshot: actions.syncSnapshot,
    }));
    syncMirrorPort(mirrorPort, store.getSnapshot());
    return result;
  }
  return {
    store,
    batch: applyBatch,
    getSnapshot: () => store.getSnapshot(),
    jobId: () => store.getSnapshot().jobId,
    snapshot: () => store.getSnapshot().snapshot,
    snapshotFor: (jobId) => {
      const snapshot = store.getSnapshot();
      return snapshot.jobId === jobId ? snapshot.snapshot : null;
    },
    finishedAt: () => store.getSnapshot().finishedAt,
    resumePlan: () => {
      const snapshot = store.getSnapshot();
      return snapshot.jobId && snapshot.resumePlanJobId === snapshot.jobId
        ? snapshot.resumePlan || null
        : null;
    },
    syncSnapshot: (job, jobId, meta = {}) => applyCurrentJobAction(
      state,
      (currentStore) => currentStore.actions.syncSnapshot(job, jobId, meta),
      mirrorPort,
    ),
    clearTiming: () => applyCurrentJobAction(
      state,
      (currentStore) => currentStore.actions.clearTiming(),
      mirrorPort,
    ),
    cacheDiagnostics: (jobId, payload) => applyCurrentJobAction(
      state,
      (currentStore) => currentStore.actions.cacheDiagnostics(jobId, payload),
      mirrorPort,
    ),
    cacheResumePlan: (jobId, payload) => applyCurrentJobAction(
      state,
      (currentStore) => currentStore.actions.cacheResumePlan(jobId, payload),
      mirrorPort,
    ),
  };
}

export function currentJobId(state) {
  return `${state.currentJobId || ""}`.trim();
}

export function currentJobSnapshot(state) {
  return state.currentJobSnapshot || null;
}

export function currentJobFinishedAt(state) {
  return `${state.currentJobFinishedAt || ""}`.trim();
}

export function currentJobSnapshotFor(state, jobId) {
  return state.currentJobId === jobId ? state.currentJobSnapshot : null;
}

export function syncCurrentJobSnapshot(state, job, jobId, {
  startedAt = "",
  finishedAt = "",
} = {}) {
  createCurrentJobStatePort(state).syncSnapshot(job, jobId, { startedAt, finishedAt });
}

export function clearCurrentJobTiming(state) {
  createCurrentJobStatePort(state).clearTiming();
}

export function cacheJobDiagnostics(state, jobId, payload) {
  createCurrentJobStatePort(state).cacheDiagnostics(jobId, payload);
}

export function cacheJobResumePlan(state, jobId, payload) {
  createCurrentJobStatePort(state).cacheResumePlan(jobId, payload);
}
