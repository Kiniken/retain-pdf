import { createStore } from "../../app-framework/store.js";

export const SECONDARY_RESOURCE_TYPES = Object.freeze([
  "events",
  "manifest",
  "stageActions",
]);

const SECONDARY_RESOURCE_STORE_KEY = Symbol.for("retainpdf.secondaryResourceStore");

const SECONDARY_RESOURCE_FIELDS = Object.freeze({
  events: {
    payload: "currentJobEvents",
    jobId: "currentJobEventsJobId",
    fetchedAt: "currentJobEventsFetchedAt",
    inFlight: "currentJobEventsFetchInFlight",
  },
  manifest: {
    payload: "currentJobManifest",
    jobId: "currentJobManifestJobId",
    fetchedAt: "currentJobManifestFetchedAt",
    inFlight: "currentJobManifestFetchInFlight",
  },
  stageActions: {
    payload: "currentJobStageActions",
    jobId: "currentJobStageActionsJobId",
    fetchedAt: "currentJobStageActionsFetchedAt",
    inFlight: "currentJobStageActionsFetchInFlight",
  },
});

function secondaryResourceFields(type) {
  return SECONDARY_RESOURCE_FIELDS[type] || null;
}

function emptySecondaryResourceRecord() {
  return {
    payload: null,
    jobId: "",
    fetchedAt: 0,
    inFlight: false,
  };
}

function normalizeSecondaryResourceRecord(initialState = {}, type) {
  const fields = secondaryResourceFields(type);
  if (!fields) {
    return emptySecondaryResourceRecord();
  }
  return {
    payload: initialState[fields.payload] ?? null,
    jobId: `${initialState[fields.jobId] || ""}`.trim(),
    fetchedAt: Number(initialState[fields.fetchedAt] || 0),
    inFlight: Boolean(initialState[fields.inFlight]),
  };
}

function normalizeSecondaryResourcesState(initialState = {}) {
  return Object.fromEntries(
    SECONDARY_RESOURCE_TYPES.map((type) => [
      type,
      normalizeSecondaryResourceRecord(initialState, type),
    ]),
  );
}

export function createSecondaryResourceStore(initialState = {}) {
  return createStore({
    name: "secondaryResources",
    initialState: normalizeSecondaryResourcesState(initialState),
    actions: {
      setInFlight(currentState, type, value) {
        if (!secondaryResourceFields(type)) {
          return currentState;
        }
        return {
          ...currentState,
          [type]: {
            ...(currentState[type] || emptySecondaryResourceRecord()),
            inFlight: Boolean(value),
          },
        };
      },
      cache(currentState, type, jobId, payload, fetchedAt) {
        if (!secondaryResourceFields(type)) {
          return currentState;
        }
        return {
          ...currentState,
          [type]: {
            payload,
            jobId: `${jobId || ""}`.trim(),
            fetchedAt: Number(fetchedAt || 0),
            inFlight: Boolean(currentState[type]?.inFlight),
          },
        };
      },
      clearForOtherJob(currentState, type, jobId) {
        if (!secondaryResourceFields(type)) {
          return currentState;
        }
        const current = currentState[type] || emptySecondaryResourceRecord();
        const normalizedJobId = `${jobId || ""}`.trim();
        if (!current.jobId || current.jobId === normalizedJobId) {
          return currentState;
        }
        return {
          ...currentState,
          [type]: {
            ...emptySecondaryResourceRecord(),
            inFlight: Boolean(current.inFlight),
          },
        };
      },
      reset(currentState) {
        return Object.fromEntries(
          SECONDARY_RESOURCE_TYPES.map((type) => [
            type,
            {
              ...emptySecondaryResourceRecord(),
              inFlight: Boolean(currentState[type]?.inFlight),
            },
          ]),
        );
      },
      resetWithInFlight(currentState) {
        return currentState;
      },
    },
  });
}

export function secondaryResourceStoreFor(state) {
  if (!state || typeof state !== "object") {
    return createSecondaryResourceStore();
  }
  if (!state[SECONDARY_RESOURCE_STORE_KEY]) {
    Object.defineProperty(state, SECONDARY_RESOURCE_STORE_KEY, {
      configurable: false,
      enumerable: false,
      value: createSecondaryResourceStore(state),
      writable: false,
    });
  }
  return state[SECONDARY_RESOURCE_STORE_KEY];
}

function syncLegacySecondaryResourceState(state, snapshot) {
  if (!state) {
    return;
  }
  for (const type of SECONDARY_RESOURCE_TYPES) {
    const fields = secondaryResourceFields(type);
    const record = snapshot[type] || emptySecondaryResourceRecord();
    state[fields.payload] = record.payload;
    state[fields.jobId] = record.jobId;
    state[fields.fetchedAt] = record.fetchedAt;
    state[fields.inFlight] = Boolean(record.inFlight);
  }
}

function applySecondaryResourceAction(state, action) {
  const store = secondaryResourceStoreFor(state);
  const snapshot = action(store);
  syncLegacySecondaryResourceState(state, snapshot);
  return snapshot;
}

export function createSecondaryResourceStatePort(state, {
  now = () => Date.now(),
} = {}) {
  const store = secondaryResourceStoreFor(state);
  syncLegacySecondaryResourceState(state, store.getSnapshot());
  function applyBatch(callback) {
    if (typeof callback !== "function") {
      return store.getSnapshot();
    }
    const result = store.batch(({ actions }) => callback({
      actions,
      cache: (type, jobId, payload) => actions.cache(type, jobId, payload, now()),
      clearForOtherJob: actions.clearForOtherJob,
      getSnapshot: () => store.getSnapshot(),
      setInFlight: actions.setInFlight,
    }));
    syncLegacySecondaryResourceState(state, store.getSnapshot());
    return result;
  }
  return {
    store,
    batch: applyBatch,
    getSnapshot: () => store.getSnapshot(),
    isInFlight(type) {
      const record = store.getSnapshot()[type];
      return Boolean(record?.inFlight);
    },
    fetchedAt(type) {
      const record = store.getSnapshot()[type];
      return Number(record?.fetchedAt || 0);
    },
    shouldRefresh(type, intervalMs, force = false) {
      return shouldRefreshSecondary(this.fetchedAt(type), intervalMs, force);
    },
    setInFlight(type, value) {
      return applySecondaryResourceAction(
        state,
        (currentStore) => currentStore.actions.setInFlight(type, value),
      );
    },
    clearInFlightForCurrentJob(type, jobId) {
      if (state?.currentJobId === jobId) {
        return this.setInFlight(type, false);
      }
      return store.getSnapshot();
    },
    cache(type, jobId, payload) {
      return applySecondaryResourceAction(
        state,
        (currentStore) => currentStore.actions.cache(type, jobId, payload, now()),
      );
    },
    clearForOtherJob(type, jobId) {
      return applySecondaryResourceAction(
        state,
        (currentStore) => currentStore.actions.clearForOtherJob(type, jobId),
      );
    },
    cachedFor(type, jobId) {
      const record = store.getSnapshot()[type];
      return record?.jobId === jobId ? record.payload : null;
    },
    sync(type, jobId, payload) {
      if (payload === null) {
        this.clearForOtherJob(type, jobId);
        return this.cachedFor(type, jobId);
      }
      this.cache(type, jobId, payload);
      return this.cachedFor(type, jobId);
    },
    reset({ preserveInFlight = true } = {}) {
      const current = store.getSnapshot();
      const next = Object.fromEntries(
        SECONDARY_RESOURCE_TYPES.map((type) => [
          type,
          {
            ...emptySecondaryResourceRecord(),
            inFlight: preserveInFlight ? Boolean(current[type]?.inFlight) : false,
          },
        ]),
      );
      const snapshot = store.reset(next);
      syncLegacySecondaryResourceState(state, snapshot);
      return snapshot;
    },
  };
}

export function resetSecondaryResourceState(state, options = {}) {
  return createSecondaryResourceStatePort(state).reset(options);
}

export function isSecondaryFetchInFlight(state, type) {
  return createSecondaryResourceStatePort(state).isInFlight(type);
}

export function secondaryResourceFetchedAt(state, type) {
  return createSecondaryResourceStatePort(state).fetchedAt(type);
}

export function setSecondaryFetchInFlight(state, type, value) {
  createSecondaryResourceStatePort(state).setInFlight(type, value);
}

export function clearSecondaryFetchInFlightForCurrentJob(state, type, jobId) {
  createSecondaryResourceStatePort(state).clearInFlightForCurrentJob(type, jobId);
}

export function cacheSecondaryResource(state, type, jobId, payload) {
  createSecondaryResourceStatePort(state).cache(type, jobId, payload);
}

export function clearSecondaryResourceForOtherJob(state, type, jobId) {
  createSecondaryResourceStatePort(state).clearForOtherJob(type, jobId);
}

export function cachedSecondaryResourceFor(state, type, jobId) {
  return createSecondaryResourceStatePort(state).cachedFor(type, jobId);
}

export function syncSecondaryResource(state, type, jobId, payload) {
  return createSecondaryResourceStatePort(state).sync(type, jobId, payload);
}

export function cachedEventsFor(state, jobId) {
  return cachedSecondaryResourceFor(state, "events", jobId);
}

export function cachedManifestFor(state, jobId) {
  return cachedSecondaryResourceFor(state, "manifest", jobId);
}

export function cachedStageActionsFor(state, jobId) {
  return cachedSecondaryResourceFor(state, "stageActions", jobId);
}

export function shouldRefreshSecondary(lastFetchedAt, refreshMs, force) {
  if (force) {
    return true;
  }
  if (!Number.isFinite(lastFetchedAt) || lastFetchedAt <= 0) {
    return true;
  }
  return (Date.now() - lastFetchedAt) >= refreshMs;
}
