import {
  RECENT_JOBS_CLASSES,
  RECENT_JOBS_IDS,
} from "./recent-jobs-dialog-dom-contract.js";
import { APP_DIALOG_IDS } from "../../contracts/app-contract.js";
import {
  applyRecentJobsEmptyState,
  applyRecentJobsErrorState,
  applyRecentJobsListState,
  applyRecentJobsLoadMoreLoadingState,
  applyRecentJobsLoadingState,
  RECENT_JOBS_VIEW_TEXT,
} from "./recent-jobs-dialog-view-state.js";

function byDialogId(root, id) {
  return root?.querySelector?.(`#${id}`) || null;
}

export function recentJobsElements(host) {
  const root = host || document;
  return {
    summary: byDialogId(root, RECENT_JOBS_IDS.summary),
    list: byDialogId(root, RECENT_JOBS_IDS.list),
    empty: byDialogId(root, RECENT_JOBS_IDS.empty),
    loadMoreButton: byDialogId(root, RECENT_JOBS_IDS.loadMoreButton),
    body: byDialogId(root, RECENT_JOBS_IDS.scrollBody),
    dialog: byDialogId(root, APP_DIALOG_IDS.recentJobs),
  };
}

export function setRecentJobsOpen(host, open) {
  const { dialog } = recentJobsElements(host);
  if (!dialog) {
    return;
  }
  if (open) {
    dialog.showModal();
  } else {
    dialog.close();
  }
}

export function renderRecentJobsSummary(host, text) {
  const { summary } = recentJobsElements(host);
  if (summary) {
    summary.textContent = text;
  }
}

export function renderRecentJobsLoading(host) {
  const { list, empty, loadMoreButton } = recentJobsElements(host);
  applyRecentJobsLoadingState({ list, empty, loadMoreButton }, {
    loadingText: RECENT_JOBS_VIEW_TEXT.loadingDialog,
  });
}

export function renderRecentJobsEmpty(host, message) {
  const { list, empty, loadMoreButton } = recentJobsElements(host);
  applyRecentJobsEmptyState({ list, empty, loadMoreButton }, message);
}

export function renderRecentJobsError(host, message, { reset = false } = {}) {
  const { list, empty, loadMoreButton } = recentJobsElements(host);
  applyRecentJobsErrorState({ list, empty, loadMoreButton }, message, { reset });
}

export function renderRecentJobsList(
  host,
  markup,
  {
    reset = false,
    hasMore = false,
    onSelect,
    onDelete,
    onReader,
    bindListEvents = () => {},
    hydrateImages = () => {},
  } = {},
) {
  const { list, empty, loadMoreButton } = recentJobsElements(host);
  if (!list || !empty || !loadMoreButton) {
    return;
  }
  bindListEvents(list, { onSelect, onDelete, onReader });
  if (!applyRecentJobsListState({ list, empty, loadMoreButton }, { hasMore })) {
    return;
  }
  list.innerHTML = reset ? markup : `${list.innerHTML}${markup}`;
  hydrateImages(list);
}

export function setRecentJobsLoadMoreLoading(host) {
  const { loadMoreButton } = recentJobsElements(host);
  applyRecentJobsLoadMoreLoadingState({ loadMoreButton }, {
    loadingText: RECENT_JOBS_VIEW_TEXT.loadMoreLoadingDialog,
  });
}

export function shouldAutoLoadRecentJobs(host) {
  const { body, loadMoreButton } = recentJobsElements(host);
  if (!body || !loadMoreButton || loadMoreButton.classList.contains(RECENT_JOBS_CLASSES.hidden) || loadMoreButton.disabled) {
    return false;
  }
  const remaining = body.scrollHeight - body.scrollTop - body.clientHeight;
  return remaining < Math.max(260, body.clientHeight * 0.35);
}
