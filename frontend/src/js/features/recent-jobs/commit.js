import {
  RECENT_JOBS_LOADING_STATES,
} from "./loading-state-contract.js";
import {
  hasActiveRecentJobs,
} from "./active-refresh.js";
import {
  dedupeRecentJobs,
} from "./pagination.js";

function defaultSetTimeout(callback, delay) {
  return globalThis.window?.setTimeout
    ? globalThis.window.setTimeout(callback, delay)
    : globalThis.setTimeout?.(callback, delay);
}

export function commitRecentJobsPage({
  reset = false,
  collected = [],
  hasMore = false,
  nextOffset = 0,
  invocationSummary = null,
  query = "",
  recentJobActions,
  runtimePatches,
  activeRefreshLoop,
  scheduleAutoLoadIfNeeded,
  recentJobsStatePort,
  setTimeoutFn = defaultSetTimeout,
  storeDrivenRendering = false,
  viewPort,
} = {}) {
  const latestItems = reset ? [] : recentJobsStatePort.getSnapshot().items;
  const nextItems = runtimePatches.apply(dedupeRecentJobs(reset ? collected : [...latestItems, ...collected]));
  const renderItems = reset
    ? nextItems
    : (runtimePatches.applyExisting?.(collected) || runtimePatches.apply(collected));

  if (typeof recentJobsStatePort.batch === "function") {
    recentJobsStatePort.batch(({ setOffset, setHasMore, setInvocationSummary, setItems }) => {
      setOffset(nextOffset);
      setHasMore(hasMore);
      setInvocationSummary(invocationSummary);
      setItems(nextItems);
    });
  } else {
    recentJobsStatePort.setOffset(nextOffset);
    recentJobsStatePort.setHasMore(hasMore);
    recentJobsStatePort.setInvocationSummary?.(invocationSummary);
    recentJobsStatePort.setItems(nextItems);
  }

  if (hasActiveRecentJobs(nextItems)) {
    activeRefreshLoop()?.schedule();
  } else {
    activeRefreshLoop()?.stop();
  }
  if (!storeDrivenRendering) {
    viewPort.renderList({
      items: renderItems,
      allItems: nextItems,
      invocationSummary,
      reset,
      hasMore,
      onSelect: recentJobActions.selectJob,
      onDelete: recentJobActions.deleteJob,
      onReader: recentJobActions.openJobReader,
    });
  }

  if (hasMore && !`${query || ""}`.trim()) {
    setTimeoutFn(() => scheduleAutoLoadIfNeeded?.(), 0);
  }

  return {
    nextItems,
    renderItems,
  };
}

export function commitRecentJobsEmpty({
  query = "",
  invocationSummary = null,
  homeStatePort,
  recentJobsStatePort,
  storeDrivenRendering = false,
  renderEmpty,
  viewPort,
} = {}) {
  recentJobsStatePort.setItems([]);
  recentJobsStatePort.setHasMore(false);
  homeStatePort.setRecentJobsLoadingState(RECENT_JOBS_LOADING_STATES.READY);
  const message = `${query || ""}`.trim() ? "没有匹配的书籍" : "暂无最近任务";
  if (!storeDrivenRendering) {
    viewPort.renderEmpty(message, invocationSummary);
  }
  return { message };
}

export function commitRecentJobsNoMore({
  homeStatePort,
  recentJobsStatePort,
  storeDrivenRendering = false,
  renderError,
  viewPort,
} = {}) {
  recentJobsStatePort.setHasMore(false);
  homeStatePort.setRecentJobsLoadingState(RECENT_JOBS_LOADING_STATES.READY);
  if (!storeDrivenRendering) {
    viewPort.renderError("", { reset: false });
  }
}

export function commitRecentJobsError({
  error,
  reset = false,
  homeStatePort,
  recentJobsStatePort,
  storeDrivenRendering = false,
  renderError,
  viewPort,
} = {}) {
  const message = error?.message || "读取最近任务失败";
  if (!reset) {
    recentJobsStatePort.setHasMore(false);
  }
  homeStatePort.setRecentJobsLoadingState(RECENT_JOBS_LOADING_STATES.ERROR, message);
  if (!storeDrivenRendering) {
    viewPort.renderError(message, { reset });
  }
  return { message };
}
