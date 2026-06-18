import { createStore } from "../../app-framework/store.js";

export const JOB_POLL_INTERVAL_MS = 1000;

const RUNTIME_POLLING_STORE_KEY = Symbol.for("retainpdf.runtimePollingStore");

function normalizePollingState(initialState = {}) {
  return {
    jobId: `${initialState.jobId ?? initialState.currentJobId ?? ""}`.trim(),
    generation: Number(initialState.generation ?? initialState.currentJobPollGeneration ?? 0),
    pollInFlight: Boolean(initialState.pollInFlight ?? initialState.currentJobPollInFlight),
  };
}

export function createRuntimePollingStore(initialState = {}) {
  return createStore({
    name: "runtimePolling",
    initialState: normalizePollingState(initialState),
    actions: {
      stop(currentState) {
        return {
          ...currentState,
          pollInFlight: false,
        };
      },
      beginPoll(currentState) {
        if (currentState.pollInFlight) {
          return currentState;
        }
        return {
          ...currentState,
          pollInFlight: true,
        };
      },
      finishPoll(currentState) {
        return {
          ...currentState,
          pollInFlight: false,
        };
      },
      startJob(currentState, jobId) {
        return {
          ...currentState,
          jobId: `${jobId || ""}`.trim(),
          generation: Number(currentState.generation || 0) + 1,
          pollInFlight: false,
        };
      },
    },
  });
}

export function runtimePollingStoreFor(state) {
  if (!state || typeof state !== "object") {
    return createRuntimePollingStore();
  }
  if (!state[RUNTIME_POLLING_STORE_KEY]) {
    Object.defineProperty(state, RUNTIME_POLLING_STORE_KEY, {
      configurable: false,
      enumerable: false,
      value: createRuntimePollingStore(state),
      writable: false,
    });
  }
  return state[RUNTIME_POLLING_STORE_KEY];
}

function syncLegacyRuntimePollingState(state, snapshot) {
  if (!state) {
    return;
  }
  state.currentJobId = snapshot.jobId;
  state.currentJobPollGeneration = snapshot.generation;
  state.currentJobPollInFlight = snapshot.pollInFlight;
}

function applyRuntimePollingAction(state, action) {
  const store = runtimePollingStoreFor(state);
  const snapshot = action(store);
  syncLegacyRuntimePollingState(state, snapshot);
  return snapshot;
}

export function createRuntimePollingStatePort(state, {
  clearIntervalFn = clearInterval,
  setIntervalFn = setInterval,
  now = () => new Date().toISOString(),
} = {}) {
  const store = runtimePollingStoreFor(state);
  syncLegacyRuntimePollingState(state, store.getSnapshot());
  return {
    store,
    getSnapshot: () => store.getSnapshot(),
    stop() {
      if (state?.timer) {
        clearIntervalFn(state.timer);
        state.timer = null;
      }
      const snapshot = applyRuntimePollingAction(state, (currentStore) => currentStore.actions.stop());
      if (state) {
        state.currentJobEventsFetchInFlight = false;
        state.currentJobManifestFetchInFlight = false;
        state.currentJobStageActionsFetchInFlight = false;
      }
      return snapshot;
    },
    beginPoll() {
      const current = store.getSnapshot();
      if (current.pollInFlight) {
        return null;
      }
      const snapshot = applyRuntimePollingAction(state, (currentStore) => currentStore.actions.beginPoll());
      return snapshot.generation;
    },
    finishPoll() {
      return applyRuntimePollingAction(state, (currentStore) => currentStore.actions.finishPoll());
    },
    isCurrentGeneration(jobId, generation) {
      const current = store.getSnapshot();
      return current.jobId === jobId && Number(generation) === Number(current.generation || 0);
    },
    startJob(jobId) {
      const snapshot = applyRuntimePollingAction(
        state,
        (currentStore) => currentStore.actions.startJob(jobId),
      );
      if (state && !state.currentJobStartedAt) {
        state.currentJobStartedAt = now();
      }
      return {
        generation: Number(snapshot.generation || 0),
        startedAt: state?.currentJobStartedAt || "",
      };
    },
    startTimer(callback, intervalMs = JOB_POLL_INTERVAL_MS) {
      if (state?.timer) {
        clearIntervalFn(state.timer);
      }
      const timer = setIntervalFn(callback, intervalMs);
      if (state) {
        state.timer = timer;
      }
      return timer;
    },
  };
}

export function stopPolling(state) {
  createRuntimePollingStatePort(state).stop();
}

export function beginJobPoll(state) {
  return createRuntimePollingStatePort(state).beginPoll();
}

export function finishJobPoll(state) {
  createRuntimePollingStatePort(state).finishPoll();
}

export function isCurrentJobGeneration(state, jobId, generation) {
  return createRuntimePollingStatePort(state).isCurrentGeneration(jobId, generation);
}

export function startRuntimeJob(state, jobId) {
  return createRuntimePollingStatePort(state).startJob(jobId);
}

export function startPollingTimer(state, callback, intervalMs = JOB_POLL_INTERVAL_MS) {
  createRuntimePollingStatePort(state).startTimer(callback, intervalMs);
}
