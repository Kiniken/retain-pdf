export function createStatusDetailTranslationViewPort({
  renderItemDetail = () => {},
  renderItems = () => {},
  renderReplay = () => {},
  renderSummary = () => {},
} = {}) {
  return {
    renderItemDetail,
    renderItems,
    renderReplay,
    renderSummary,
  };
}
