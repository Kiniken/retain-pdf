export function createRecentJobsEventTarget({
  component = null,
  elements = {},
  libraryMounted = false,
} = {}) {
  const scrollBody = elements?.scrollBody || null;
  const loadMoreButton = elements?.loadMoreButton || null;
  const useComponentEvents = Boolean(component?.bindEvents && !libraryMounted);
  return {
    component,
    scrollBody,
    loadMoreButton,
    useComponentEvents,
    canBindLoadMore: Boolean(useComponentEvents || loadMoreButton),
    bindComponentEvents(options = {}) {
      if (!useComponentEvents) {
        return false;
      }
      component.bindEvents(options);
      return true;
    },
  };
}

export function recentJobsEventTarget({
  component,
  elements,
  libraryMounted,
} = {}) {
  return createRecentJobsEventTarget({
    component,
    elements,
    libraryMounted,
  });
}
