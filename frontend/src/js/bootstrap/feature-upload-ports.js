export function createUploadPorts(features) {
  return {
    currentPageRanges: () => features.uploadFeature?.currentPageRanges() || "",
    renderPageRangeSummary: () => features.uploadFeature?.renderPageRangeSummary(),
    validatePageRanges: () => features.uploadFeature?.validatePageRanges?.() ?? true,
  };
}
