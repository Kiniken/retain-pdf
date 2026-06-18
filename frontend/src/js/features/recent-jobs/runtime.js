import { createRecentJobActions } from "./actions.js";
import {
  createActiveLibraryRefreshLoop,
} from "./active-refresh.js";
import { createRecentJobsLoader } from "./loader.js";
import { createRecentJobsRuntimePatches } from "./runtime-patches.js";
import { createRecentJobsNavigationPort } from "./navigation-port.js";
import { createRecentJobsViewPort } from "./view-port.js";
import { createRecentJobsStoreRenderer } from "./store-renderer.js";

export function createRecentJobsRuntime({
  fetchJobList,
  fetchJobPayload,
  fetchLibraryBookList,
  deleteLibraryBook,
  apiPrefix,
  currentJobId = () => "",
  jobRuntimePort,
  activeJobRecoveryPort,
  navigationPort,
  readerPort,
  homeStatePort,
  recentJobsStatePort,
  libraryBooksResource,
  refreshSchedulerRef,
  stageAdapterPort,
  viewPort = createRecentJobsViewPort(),
} = {}) {
  let recentJobsLoader = null;
  let activeRefreshLoop = null;

  function refreshScheduler() {
    return refreshSchedulerRef?.();
  }

  function renderCurrentRecentJobs({ reset = true, invocationSummary = null } = {}) {
    const { items, hasMore } = recentJobsStatePort.getSnapshot();
    viewPort.renderList({
      items,
      allItems: items,
      invocationSummary,
      reset,
      hasMore,
      onSelect: recentJobActions.selectJob,
      onDelete: recentJobActions.deleteJob,
      onReader: recentJobActions.openJobReader,
    });
  }

  let storeRenderer = null;
  const runtimePatches = createRecentJobsRuntimePatches({
    renderCurrentRecentJobs,
    replaceRecentJobCard: viewPort.replaceCard,
    scheduleActiveRefresh: (options) => activeRefreshLoop?.schedule(options),
    stageAdapterPort,
    statePort: recentJobsStatePort,
    storeDrivenRendering: true,
  });

  activeRefreshLoop = createActiveLibraryRefreshLoop({
    getItems: () => recentJobsStatePort.getSnapshot().items,
    currentJobId,
    fetchJobPayload,
    apiPrefix,
    updateFromRuntime: runtimePatches.update,
    loadRecentJobs,
    isRecentJobsLoading: () => recentJobsLoader?.isLoading?.() || false,
  });

  const recentJobNavigationPort = navigationPort || createRecentJobsNavigationPort({
    closeDialog: () => refreshScheduler()?.closeDialog?.(),
    currentJobId,
    jobRuntimePort,
    readerPort,
  });

  const recentJobActions = createRecentJobActions({
    apiPrefix,
    deleteLibraryBook,
    activeJobRecoveryPort,
    navigationPort: recentJobNavigationPort,
    renderCurrentRecentJobs,
    renderRecentJobsEmpty: viewPort.renderEmpty,
    renderRecentJobsError: viewPort.renderError,
    statePort: recentJobsStatePort,
  });

  storeRenderer = createRecentJobsStoreRenderer({
    recentJobsStatePort,
    renderRecentJobsList: viewPort.renderList,
    actions: recentJobActions,
    renderActions: ["prependItem", "replaceItem", "removeJobFamily", "setOffset"],
  });

  function loadRecentJobs(options) {
    return recentJobsLoader?.load(options);
  }

  recentJobsLoader = createRecentJobsLoader({
    fetchJobList,
    fetchLibraryBookList,
    apiPrefix,
    getQuery: () => refreshScheduler()?.getQuery?.() || "",
    recentJobActions,
    runtimePatches,
    activeRefreshLoop: () => activeRefreshLoop,
    scheduleAutoLoadIfNeeded: () => refreshScheduler()?.scheduleAutoLoadIfNeeded(),
    homeStatePort,
    recentJobsStatePort,
    libraryBooksResource,
    storeDrivenRendering: true,
    viewPort,
  });

  return {
    activeRefreshLoop,
    loadRecentJobs,
    recentJobActions,
    recentJobsLoader,
    renderCurrentRecentJobs,
    storeRenderer,
    runtimePatches,
  };
}
