import {
  renderTextBlock,
} from "./formatters.js";
import { createStatusDetailTranslationDataPort } from "./translation-data-port.js";
import {
  renderTranslationEmpty,
  renderTranslationItemDetail,
  renderTranslationItems,
  renderTranslationReplay,
  renderTranslationSummary,
} from "./translation-renderer.js";
import {
  createTranslationState,
} from "./translation-state.js";
import { createStatusDetailTranslationTabCoordinator } from "./translation-tab-coordinator.js";

export function createStatusDetailTranslationTabPort({
  apiPrefix,
  currentJobId,
  dialogViewPort,
  fetchTranslationDiagnostics,
  fetchTranslationItem,
  fetchTranslationItems,
  replayTranslationItem,
  translationState = createTranslationState(),
  translationViewPort,
} = {}) {
  const dataPort = createStatusDetailTranslationDataPort({
    translationState,
    apiPrefix,
    currentJobId,
    fetchTranslationDiagnostics,
    fetchTranslationItems,
    fetchTranslationItem,
    replayTranslationItem,
  });
  const coordinator = createStatusDetailTranslationTabCoordinator({
    dataPort,
    renderEmpty: (message) => renderTranslationEmpty(message, { viewPort: translationViewPort }),
    renderSummary: () => renderTranslationSummary(translationState, { viewPort: translationViewPort }),
    renderItems: (options) => renderTranslationItems(translationState, {
      ...options,
      viewPort: translationViewPort,
    }),
    renderItemDetail: (options) => renderTranslationItemDetail(translationState, {
      ...options,
      viewPort: translationViewPort,
    }),
    renderReplay: () => renderTranslationReplay(translationState, { viewPort: translationViewPort }),
    setReplayLoading: (payload) => dialogViewPort?.renderReplay?.(payload),
  });

  return Object.freeze({
    applyFilter: (query) => coordinator.applyFilter(query),
    changePage: (direction) => coordinator.changePage(direction),
    ensureLoaded: (options) => coordinator.ensureLoaded(options),
    loadItem: (jobId, itemId) => coordinator.loadItem(jobId, itemId),
    replaySelected: () => coordinator.replaySelected(),
    renderItemError: (error) => {
      renderTranslationItemDetail(translationState, {
        emptyText: error.message || String(error),
        viewPort: translationViewPort,
      });
    },
    renderReplayError: (error) => {
      dialogViewPort?.renderReplay?.({
        hasResult: true,
        status: "重放失败",
        markup: renderTextBlock("replay_error", {
          message: error.message || String(error),
        }),
      });
    },
    state: translationState,
  });
}
