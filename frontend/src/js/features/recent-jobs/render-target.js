export function createRecentJobsRenderTarget({
  component = null,
  elements = {},
  libraryMounted = false,
} = {}) {
  const list = elements?.list || null;
  const empty = elements?.empty || null;
  const loadMoreButton = elements?.loadMoreButton || null;
  const useComponent = Boolean(component?.renderList);
  return {
    component,
    list,
    empty,
    loadMoreButton,
    useCardElements: Boolean(libraryMounted && !useComponent),
    useComponent,
    canRenderList: Boolean(useComponent || (list && empty && loadMoreButton)),
    canReplaceCard: Boolean(list),
  };
}

export function recentJobsRenderTarget({
  component,
  elements,
  libraryMounted,
} = {}) {
  return createRecentJobsRenderTarget({
    component,
    elements,
    libraryMounted,
  });
}
