export const STATUS_DETAIL_DIALOG = Object.freeze({
  hostSelector: "status-detail-dialog",
  dialogId: "status-detail-dialog",
  selectors: Object.freeze({
    openButton: "#status-detail-btn",
    tabs: ".detail-tab",
    panels: ".detail-tab-panel",
    translationItem: "[data-translation-item-id]",
  }),
  dataset: Object.freeze({
    hydrated: "hydrated",
    tab: "tab",
    panel: "panel",
    translationItemId: "translationItemId",
  }),
  ids: Object.freeze({
    headline: Object.freeze({
      icon: "status-detail-head-icon",
      jobId: "status-detail-job-id",
      note: "status-detail-head-note",
      closeButton: "status-detail-close-btn",
    }),
    tabs: Object.freeze({
      overview: "detail-tab-overview",
      failure: "detail-tab-failure",
      events: "detail-tab-events",
      translation: "detail-tab-translation",
    }),
    panels: Object.freeze({
      overview: "detail-panel-overview",
      failure: "detail-panel-failure",
      events: "detail-panel-events",
      translation: "detail-panel-translation",
    }),
    runtime: Object.freeze({
      currentStage: "runtime-current-stage",
      stageElapsed: "runtime-stage-elapsed",
      totalElapsed: "runtime-total-elapsed",
      retryCount: "runtime-retry-count",
      lastTransition: "runtime-last-transition",
      terminalReason: "runtime-terminal-reason",
      inputProtocol: "runtime-input-protocol",
      stageSpecVersion: "runtime-stage-spec-version",
      mathMode: "runtime-math-mode",
    }),
    stageHistory: Object.freeze({
      list: "overview-stage-list",
      empty: "overview-stage-empty",
    }),
    failure: Object.freeze({
      rerunButton: "failure-rerun-btn",
      rerunStatus: "failure-rerun-status",
      summary: "failure-summary",
      category: "failure-category",
      stage: "failure-stage",
      rootCause: "failure-root-cause",
      suggestion: "failure-suggestion",
      lastLogLine: "failure-last-log-line",
      retryable: "failure-retryable",
    }),
    events: Object.freeze({
      status: "events-status",
      empty: "events-empty",
      list: "events-list",
    }),
    translation: Object.freeze({
      debugStatus: "translation-debug-status",
      debugEmpty: "translation-debug-empty",
      debugContent: "translation-debug-content",
      countTranslated: "translation-count-translated",
      countPartiallyTranslated: "translation-count-partially-translated",
      countKeptOrigin: "translation-count-kept-origin",
      countFailed: "translation-count-failed",
      providerFamily: "translation-provider-family",
      listFilter: "translation-list-filter",
      filterFinalStatus: "translation-filter-final-status",
      filterQuery: "translation-filter-query",
      filterApply: "translation-filter-apply",
      itemsMeta: "translation-items-meta",
      itemsLoading: "translation-items-loading",
      itemsEmpty: "translation-items-empty",
      itemsList: "translation-items-list",
      itemsPrev: "translation-items-prev",
      itemsPage: "translation-items-page",
      itemsNext: "translation-items-next",
      itemMeta: "translation-item-meta",
      itemLoading: "translation-item-loading",
      itemEmpty: "translation-item-empty",
      itemDetail: "translation-item-detail",
      itemReplay: "translation-item-replay",
      replayStatus: "translation-replay-status",
      replayResult: "translation-replay-result",
    }),
  }),
});

export function idSelector(id) {
  return `#${id}`;
}

export function dataAttribute(datasetKey) {
  return `${datasetKey || ""}`.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
