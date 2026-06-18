export function createStatusDetailDialogViewPort({
  renderReplay = () => {},
  renderSnapshot = () => {},
} = {}) {
  return {
    renderReplay,
    renderSnapshot,
  };
}
