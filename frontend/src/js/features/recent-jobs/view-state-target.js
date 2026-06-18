export function createRecentJobsViewStateTarget({
  component = null,
  elements = {},
} = {}) {
  const list = elements?.list || null;
  const empty = elements?.empty || null;
  const loadMoreButton = elements?.loadMoreButton || null;
  return {
    component,
    list,
    empty,
    loadMoreButton,
    canApplyDomState: Boolean(list && empty && loadMoreButton),
    canApplyLoadMoreState: Boolean(loadMoreButton),
    applyComponentState(method, ...args) {
      const renderer = component?.[method];
      if (typeof renderer !== "function") {
        return false;
      }
      renderer.apply(component, args);
      return true;
    },
  };
}

export function recentJobsViewStateTarget({
  component,
  elements,
} = {}) {
  return createRecentJobsViewStateTarget({
    component,
    elements,
  });
}
