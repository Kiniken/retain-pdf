import {
  bindReaderRegionHover,
  bindPrimaryViewer,
  scheduleScaleRefresh,
} from "./pdf-controller.js";
import { setPageIndicator } from "./view.js";

function resolveTotalPagesForReady(ready, metadata) {
  if (!ready) {
    return 0;
  }
  return Number(metadata?.page_count) || ready.pagesCount || 0;
}

function resolveActiveViewerKey(mode, sourceReady, translatedReady) {
  if (mode === "translated" && translatedReady) {
    return translatedReady.key;
  }
  if (mode === "source" && sourceReady) {
    return sourceReady.key;
  }
  return sourceReady?.key || translatedReady?.key || "";
}

export function bindReaderInteractions({
  apiPrefix,
  bindPrimary = bindPrimaryViewer,
  bindRegions = bindReaderRegionHover,
  fetchTranslationItem,
  getReaderMode = () => globalThis.document?.body?.dataset?.readerMode || "compare",
  jobId,
  pageState,
  readerMetadata,
  regionsPayload,
  scheduleScale = scheduleScaleRefresh,
  setIndicator = setPageIndicator,
  sourceReady,
  translatedReady,
} = {}) {
  const primary = sourceReady || translatedReady;
  if (!primary || !pageState?.reader) {
    return null;
  }

  const viewerState = {
    [sourceReady?.key || ""]: {
      currentPage: 1,
      totalPages: resolveTotalPagesForReady(sourceReady, readerMetadata?.source),
    },
    [translatedReady?.key || ""]: {
      currentPage: 1,
      totalPages: resolveTotalPagesForReady(translatedReady, readerMetadata?.translated),
    },
  };
  delete viewerState[""];

  function syncIndicatorForMode(mode = getReaderMode()) {
    const activeKey = resolveActiveViewerKey(mode, sourceReady, translatedReady);
    const activeState = viewerState[activeKey] || viewerState[primary.key] || {};
    pageState.reader.primaryViewerKey = activeKey || primary.key;
    pageState.reader.currentPage = activeState.currentPage || 1;
    pageState.reader.totalPages = activeState.totalPages || primary.pagesCount || 0;
    setIndicator(pageState.reader.currentPage, pageState.reader.totalPages);
  }

  [sourceReady, translatedReady].filter(Boolean).forEach((ready) => {
    bindPrimary(ready.controller, (pageNumber) => {
      if (!viewerState[ready.key]) {
        return;
      }
      viewerState[ready.key].currentPage = pageNumber || 1;
      if (resolveActiveViewerKey(getReaderMode(), sourceReady, translatedReady) === ready.key) {
        syncIndicatorForMode();
      }
    });
  });
  syncIndicatorForMode();

  bindRegions({
    regions: regionsPayload?.items || [],
    sourceController: sourceReady?.controller,
    translatedController: translatedReady?.controller,
    jobId,
    apiPrefix,
    fetchTranslationItem,
  });
  scheduleScale();

  return {
    primary,
    syncIndicatorForMode,
    totalPages: pageState.reader.totalPages,
    viewerState,
  };
}
