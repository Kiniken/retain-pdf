import {
  bindReaderRegionHover,
  bindPrimaryViewer,
  scheduleScaleRefresh,
} from "./pdf-controller.js";
import { setPageIndicator } from "./view.js";

export function bindReaderInteractions({
  apiPrefix,
  bindPrimary = bindPrimaryViewer,
  bindRegions = bindReaderRegionHover,
  fetchTranslationItem,
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

  pageState.reader.primaryViewerKey = primary.key;
  pageState.reader.totalPages = readerMetadata?.source?.page_count
    || readerMetadata?.translated?.page_count
    || primary.pagesCount
    || 0;
  pageState.reader.currentPage = 1;

  bindPrimary(primary.controller, (pageNumber) => {
    pageState.reader.currentPage = pageNumber || 1;
    setIndicator(pageState.reader.currentPage, pageState.reader.totalPages);
  });

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
    totalPages: pageState.reader.totalPages,
  };
}
