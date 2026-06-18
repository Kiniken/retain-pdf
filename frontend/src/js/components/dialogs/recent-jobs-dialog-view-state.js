import {
  RECENT_JOBS_CLASSES,
} from "./recent-jobs-dialog-dom-contract.js";

export const RECENT_JOBS_VIEW_TEXT = Object.freeze({
  loadMore: "更多",
  loadingMain: "正在加载最近任务…",
  loadingDialog: "正在加载最近任务...",
  loadMoreLoadingMain: "加载中…",
  loadMoreLoadingDialog: "加载中...",
  empty: "暂无最近任务",
  error: "读取最近任务失败",
});

export function resetRecentJobsLoadMoreButton(loadMoreButton) {
  if (!loadMoreButton) {
    return;
  }
  loadMoreButton.disabled = false;
  loadMoreButton.textContent = RECENT_JOBS_VIEW_TEXT.loadMore;
}

export function setRecentJobsLoadMoreVisible(loadMoreButton, visible) {
  if (!loadMoreButton) {
    return;
  }
  loadMoreButton.classList.toggle(RECENT_JOBS_CLASSES.hidden, !visible);
}

export function applyRecentJobsLoadingState(
  { list, empty, loadMoreButton },
  { loadingText = RECENT_JOBS_VIEW_TEXT.loadingMain } = {},
) {
  if (!list || !empty || !loadMoreButton) {
    return false;
  }
  empty.classList.add(RECENT_JOBS_CLASSES.hidden);
  list.classList.remove(RECENT_JOBS_CLASSES.hidden);
  list.innerHTML = `<div class="events-empty">${loadingText}</div>`;
  loadMoreButton.classList.add(RECENT_JOBS_CLASSES.hidden);
  return true;
}

export function applyRecentJobsEmptyState(
  { list, empty, loadMoreButton },
  message,
) {
  if (!list || !empty || !loadMoreButton) {
    return false;
  }
  list.innerHTML = "";
  list.classList.add(RECENT_JOBS_CLASSES.hidden);
  empty.textContent = message || RECENT_JOBS_VIEW_TEXT.empty;
  empty.classList.remove(RECENT_JOBS_CLASSES.hidden);
  loadMoreButton.classList.add(RECENT_JOBS_CLASSES.hidden);
  resetRecentJobsLoadMoreButton(loadMoreButton);
  return true;
}

export function applyRecentJobsErrorState(
  { list, empty, loadMoreButton },
  message,
  { reset = false } = {},
) {
  if (!list || !empty || !loadMoreButton) {
    return false;
  }
  if (reset) {
    list.innerHTML = "";
    list.classList.add(RECENT_JOBS_CLASSES.hidden);
    empty.textContent = message || RECENT_JOBS_VIEW_TEXT.error;
    empty.classList.remove(RECENT_JOBS_CLASSES.hidden);
  } else {
    loadMoreButton.classList.add(RECENT_JOBS_CLASSES.hidden);
  }
  resetRecentJobsLoadMoreButton(loadMoreButton);
  return true;
}

export function applyRecentJobsListState(
  { list, empty, loadMoreButton },
  { hasMore = false } = {},
) {
  if (!list || !empty || !loadMoreButton) {
    return false;
  }
  list.classList.remove(RECENT_JOBS_CLASSES.hidden);
  empty.classList.add(RECENT_JOBS_CLASSES.hidden);
  setRecentJobsLoadMoreVisible(loadMoreButton, hasMore);
  resetRecentJobsLoadMoreButton(loadMoreButton);
  return true;
}

export function applyRecentJobsLoadMoreLoadingState(
  { loadMoreButton },
  { loadingText = RECENT_JOBS_VIEW_TEXT.loadMoreLoadingMain } = {},
) {
  if (!loadMoreButton) {
    return false;
  }
  loadMoreButton.disabled = true;
  loadMoreButton.textContent = loadingText;
  return true;
}
