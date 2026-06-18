export function createStatusDetailEventCommands({
  openStatusDetailDialog,
  activateDetailTab,
  applyTranslationFilter,
  changeTranslationPage,
  loadTranslationItem,
  replayTranslation,
  rerunCurrentJob,
  currentJobId,
  renderTranslationItemError,
  renderTranslationReplayError,
}) {
  async function selectTranslationItem(itemId) {
    const normalizedItemId = `${itemId || ""}`.trim();
    if (!normalizedItemId) {
      return;
    }
    try {
      await loadTranslationItem(currentJobId(), normalizedItemId);
    } catch (error) {
      renderTranslationItemError?.(error);
    }
  }

  async function replayCurrentTranslationItem() {
    try {
      await replayTranslation();
    } catch (error) {
      renderTranslationReplayError?.(error);
    }
  }

  return {
    openOverview() {
      openStatusDetailDialog("overview");
    },
    activateTab(name = "overview") {
      activateDetailTab(name);
    },
    applyTranslationFilter,
    changeTranslationPage,
    selectTranslationItem,
    replayCurrentTranslationItem,
    rerunCurrentJob,
  };
}
