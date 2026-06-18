import {
  RECENT_JOBS_IDS,
  RECENT_JOBS_SELECTORS,
  RECENT_JOBS_TAGS,
} from "./dom-contract.js";

export function byRecentJobsId(root, id) {
  return root?.querySelector?.(`#${id}`);
}

export function recentJobsRoot(doc = document) {
  return doc.querySelector?.(`#${RECENT_JOBS_IDS.libraryView}`) || doc;
}

export function isLibraryMainViewMounted(doc = document) {
  return Boolean(doc.querySelector?.(RECENT_JOBS_SELECTORS.libraryList));
}

export function recentJobsDialogComponent(doc = document) {
  if (isLibraryMainViewMounted(doc)) {
    return null;
  }
  return doc.querySelector?.(RECENT_JOBS_TAGS.dialog) || null;
}

export function recentJobsElements(doc = document) {
  const root = recentJobsRoot(doc);
  return {
    root,
    list: byRecentJobsId(root, RECENT_JOBS_IDS.list),
    empty: byRecentJobsId(root, RECENT_JOBS_IDS.empty),
    summary: byRecentJobsId(root, RECENT_JOBS_IDS.summary),
    loadMoreButton: byRecentJobsId(root, RECENT_JOBS_IDS.loadMoreButton),
    scrollBody: byRecentJobsId(root, RECENT_JOBS_IDS.scrollBody),
  };
}

export function hasLegacyRecentJobsElements(doc = document) {
  const { list, empty, loadMoreButton } = recentJobsElements(doc);
  return Boolean(list && empty && loadMoreButton);
}

export function resolveRecentJobsHost(doc = document) {
  const libraryMounted = isLibraryMainViewMounted(doc);
  const component = libraryMounted ? null : recentJobsDialogComponent(doc);
  const elements = recentJobsElements(doc);
  const legacyMounted = Boolean(!component && hasLegacyRecentJobsElements(doc));
  const kind = libraryMounted
    ? "library"
    : component
      ? "component"
      : legacyMounted
        ? "legacy"
        : "missing";
  return {
    kind,
    component,
    elements,
    libraryMounted,
    legacyMounted,
    hasView: libraryMounted || Boolean(component) || legacyMounted,
  };
}
