import { createStore } from "../../app-framework/store.js";
import { dedupeRecentJobs } from "./pagination.js";

function normalizedJobId(value = "") {
  return `${value || ""}`.trim();
}

export function createRecentJobsStore(initialState = {}) {
  return createStore({
    name: "recentJobs",
    initialState: {
      offset: Number(initialState.offset ?? initialState.recentJobsOffset) || 0,
      hasMore: initialState.hasMore ?? initialState.recentJobsHasMore ?? true,
      invocationSummary: initialState.invocationSummary ?? null,
      items: Array.isArray(initialState.items ?? initialState.recentJobsItems)
        ? initialState.items ?? initialState.recentJobsItems
        : [],
    },
    actions: {
      setOffset(currentState, value) {
        return {
          ...currentState,
          offset: Number(value) || 0,
        };
      },
      setHasMore(currentState, value) {
        return {
          ...currentState,
          hasMore: Boolean(value),
        };
      },
      setItems(currentState, items) {
        return {
          ...currentState,
          items: Array.isArray(items) ? items : [],
        };
      },
      setInvocationSummary(currentState, invocationSummary = null) {
        return {
          ...currentState,
          invocationSummary: invocationSummary && typeof invocationSummary === "object"
            ? invocationSummary
            : null,
        };
      },
      replaceItem(currentState, item) {
        const jobId = normalizedJobId(item?.job_id);
        if (!jobId) {
          return currentState;
        }
        return {
          ...currentState,
          items: currentState.items.map((currentItem) => (
            normalizedJobId(currentItem?.job_id) === jobId ? item : currentItem
          )),
        };
      },
      prependItem(currentState, item) {
        const jobId = normalizedJobId(item?.job_id);
        if (!jobId) {
          return currentState;
        }
        return {
          ...currentState,
          items: dedupeRecentJobs([item, ...currentState.items]),
        };
      },
      removeJobFamily(currentState, jobId) {
        const rootJobId = normalizedJobId(jobId).replace(/-ocr$/, "");
        if (!rootJobId) {
          return currentState;
        }
        return {
          ...currentState,
          items: currentState.items.filter((item) => {
            const itemJobId = normalizedJobId(item?.job_id);
            return itemJobId !== rootJobId && itemJobId !== `${rootJobId}-ocr`;
          }),
        };
      },
      resetPagination() {
        return {
          offset: 0,
          hasMore: true,
          invocationSummary: null,
          items: [],
        };
      },
    },
  });
}

function syncLegacyRecentJobsState(targetState, snapshot) {
  if (!targetState) {
    return;
  }
  targetState.recentJobsOffset = snapshot.offset;
  targetState.recentJobsHasMore = snapshot.hasMore;
  targetState.recentJobsItems = snapshot.items;
}

export function createRecentJobsStatePort(targetState = {}) {
  const store = createRecentJobsStore(targetState);
  syncLegacyRecentJobsState(targetState, store.getSnapshot());

  function applyStoreAction(action) {
    const snapshot = action();
    syncLegacyRecentJobsState(targetState, snapshot);
    return snapshot;
  }

  function getSnapshot() {
    return store.getSnapshot();
  }

  function setOffset(value) {
    applyStoreAction(() => store.actions.setOffset(value));
  }

  function setHasMore(value) {
    applyStoreAction(() => store.actions.setHasMore(value));
  }

  function setItems(items) {
    applyStoreAction(() => store.actions.setItems(items));
  }

  function setInvocationSummary(invocationSummary) {
    applyStoreAction(() => store.actions.setInvocationSummary(invocationSummary));
  }

  function replaceItem(item) {
    applyStoreAction(() => store.actions.replaceItem(item));
  }

  function prependItem(item) {
    applyStoreAction(() => store.actions.prependItem(item));
  }

  function removeJobFamily(jobId) {
    applyStoreAction(() => store.actions.removeJobFamily(jobId));
  }

  function resetPagination() {
    applyStoreAction(() => store.actions.resetPagination());
  }

  function batch(callback) {
    if (typeof callback !== "function") {
      return getSnapshot();
    }
    const snapshot = store.batch(({ actions }) => callback({
      actions,
      getSnapshot,
      setHasMore: actions.setHasMore,
      setInvocationSummary: actions.setInvocationSummary,
      setItems: actions.setItems,
      setOffset: actions.setOffset,
      replaceItem: actions.replaceItem,
      prependItem: actions.prependItem,
      removeJobFamily: actions.removeJobFamily,
    }));
    syncLegacyRecentJobsState(targetState, store.getSnapshot());
    return snapshot;
  }

  return {
    batch,
    getSnapshot,
    prependItem,
    removeJobFamily,
    replaceItem,
    resetPagination,
    setHasMore,
    setInvocationSummary,
    setItems,
    setOffset,
    subscribe: store.subscribe,
    store,
  };
}

let defaultRecentJobsStatePort = null;

function getDefaultRecentJobsStatePort() {
  if (!defaultRecentJobsStatePort) {
    defaultRecentJobsStatePort = createRecentJobsStatePort();
  }
  return defaultRecentJobsStatePort;
}

export function getRecentJobsState() {
  return getDefaultRecentJobsStatePort().getSnapshot();
}

export function setRecentJobsOffset(value) {
  getDefaultRecentJobsStatePort().setOffset(value);
}

export function setRecentJobsHasMore(value) {
  getDefaultRecentJobsStatePort().setHasMore(value);
}

export function setRecentJobsItems(items) {
  getDefaultRecentJobsStatePort().setItems(items);
}

export function resetRecentJobsPagination() {
  getDefaultRecentJobsStatePort().resetPagination();
}
