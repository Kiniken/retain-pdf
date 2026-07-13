import {
  RECENT_JOBS_LOADING_STATES,
} from "./loading-state-contract.js";
import {
  RECENT_JOBS_PAGE_SIZE,
} from "./pagination.js";
import { createLibraryBooksResource } from "./library-books-resource.js";
import {
  commitRecentJobsEmpty,
  commitRecentJobsError,
  commitRecentJobsNoMore,
  commitRecentJobsPage,
} from "./commit.js";

export function createRecentJobsLoader({
  fetchJobList,
  fetchLibraryBookList,
  apiPrefix,
  getQuery,
  recentJobActions,
  runtimePatches,
  activeRefreshLoop,
  scheduleAutoLoadIfNeeded,
  homeStatePort,
  recentJobsStatePort,
  storeDrivenRendering = false,
  viewPort,
  libraryBooksResource = createLibraryBooksResource({
    fetchJobList,
    fetchLibraryBookList,
    apiPrefix,
  }),
}) {
  let loading = false;
  let pendingLoad = null;

  function isLoading() {
    return loading;
  }

  async function loadLibraryBooksPage(params) {
    const snapshot = await libraryBooksResource.load(params, {
      cache: false,
    });
    if (snapshot.status === "error") {
      throw snapshot.error || new Error("读取最近任务失败");
    }
    return snapshot.data || {
      collected: [],
      hasMore: false,
      latestInvocationSummary: null,
      nextOffset: params.startOffset || 0,
    };
  }

  async function load({ reset = false, silent = false, query = getQuery?.() || "" } = {}) {
    if (loading) {
      pendingLoad = {
        reset: reset || Boolean(pendingLoad?.reset),
        silent: silent && pendingLoad?.silent !== false,
        query,
      };
      return;
    }
    if (!viewPort.hasView()) {
      return;
    }
    loading = true;
    if (!silent) {
      homeStatePort.setRecentJobsLoadingState(RECENT_JOBS_LOADING_STATES.LOADING);
    }
    if (reset) {
      recentJobsStatePort.resetPagination();
      if (!silent) {
        viewPort.renderLoading();
      }
    } else {
      viewPort.setLoadMoreLoading();
    }

    try {
      const { offset, items: previousItems } = recentJobsStatePort.getSnapshot();
      const existingJobIds = new Set(
        (reset ? [] : previousItems)
          .map((item) => `${item?.job_id || ""}`.trim())
          .filter(Boolean),
      );
      const {
        collected,
        hasMore,
        latestInvocationSummary,
        nextOffset,
      } = await loadLibraryBooksPage({
        startOffset: reset ? 0 : offset,
        pageSize: RECENT_JOBS_PAGE_SIZE,
        existingJobIds,
        query,
      });

      if (reset && collected.length === 0) {
        commitRecentJobsEmpty({
          query,
          invocationSummary: latestInvocationSummary,
          homeStatePort,
          recentJobsStatePort,
          storeDrivenRendering,
          viewPort,
        });
        return;
      }
      if (!reset && collected.length === 0) {
        commitRecentJobsNoMore({
          homeStatePort,
          recentJobsStatePort,
          storeDrivenRendering,
          viewPort,
        });
        return;
      }

      commitRecentJobsPage({
        reset,
        collected,
        hasMore,
        nextOffset,
        invocationSummary: latestInvocationSummary,
        query,
        recentJobActions,
        runtimePatches,
        activeRefreshLoop,
        scheduleAutoLoadIfNeeded,
        recentJobsStatePort,
        storeDrivenRendering,
        viewPort,
      });
      homeStatePort.setRecentJobsLoadingState(RECENT_JOBS_LOADING_STATES.READY);
    } catch (err) {
      commitRecentJobsError({
        error: err,
        reset,
        homeStatePort,
        recentJobsStatePort,
        storeDrivenRendering,
        viewPort,
      });
    } finally {
      loading = false;
      if (pendingLoad) {
        const nextLoad = pendingLoad;
        pendingLoad = null;
        window.setTimeout(() => {
          void load(nextLoad);
        }, 0);
      }
    }
  }

  return {
    isLoading,
    load,
  };
}
