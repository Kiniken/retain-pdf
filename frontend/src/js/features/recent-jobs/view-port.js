import {
  bindRecentJobsEvents,
  hasRecentJobsView,
  renderRecentJobsEmpty,
  renderRecentJobsError,
  renderRecentJobsList,
  renderRecentJobsLoading,
  replaceRecentJobCard,
  scheduleRecentJobsAutoLoadCheck,
  setRecentJobsDialogOpen,
  setRecentJobsLoadMoreLoading,
} from "./view.js";

export function createRecentJobsViewPort({
  bindEvents = bindRecentJobsEvents,
  hasView = hasRecentJobsView,
  renderEmpty = renderRecentJobsEmpty,
  renderError = renderRecentJobsError,
  renderList = renderRecentJobsList,
  renderLoading = renderRecentJobsLoading,
  replaceCard = replaceRecentJobCard,
  scheduleAutoLoadCheck = scheduleRecentJobsAutoLoadCheck,
  setDialogOpen = setRecentJobsDialogOpen,
  setLoadMoreLoading = setRecentJobsLoadMoreLoading,
} = {}) {
  return {
    bindEvents,
    hasView,
    renderEmpty,
    renderError,
    renderList,
    renderLoading,
    replaceCard,
    scheduleAutoLoadCheck,
    setDialogOpen,
    setLoadMoreLoading,
  };
}
