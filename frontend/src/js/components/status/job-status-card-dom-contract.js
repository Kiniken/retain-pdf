import { DOWNLOAD_ACTION_IDS } from "../../contracts/download-action-contract.js";

export const STATUS_CARD_IDS = Object.freeze({
  cancelButton: "cancel-btn",
  detailButton: "status-detail-btn",
  stageFlow: "status-stage-flow",
  ringLabel: "status-ring-label",
  ringValue: "status-ring-value",
  ringElapsed: "status-ring-elapsed",
  stageDetail: "status-stage-detail",
  stageErrorSummary: "status-stage-error-summary",
  progressBar: "status-progress-bar",
  legacyProgressBar: "job-progress-bar",
  progressText: "job-progress-text",
  progressPercent: "status-progress-percent",
  progressRing: "status-progress-ring",
  progressRingMeta: "status-progress-ring-meta",
  stageRetry: "status-stage-retry",
  markdownBundleButton: DOWNLOAD_ACTION_IDS.STATUS_MARKDOWN_BUNDLE,
  readerButton: "reader-btn",
  pdfButton: DOWNLOAD_ACTION_IDS.PDF,
  sourcePdfButton: DOWNLOAD_ACTION_IDS.SOURCE_PDF,
  legacyBundleButton: DOWNLOAD_ACTION_IDS.BUNDLE,
  legacyMarkdownRawButton: DOWNLOAD_ACTION_IDS.MARKDOWN_RAW,
  legacyMarkdownJsonButton: DOWNLOAD_ACTION_IDS.MARKDOWN_JSON,
});

export const STATUS_CARD_SELECTORS = Object.freeze({
  body: ".status-card-body",
  progressBlock: ".status-progress-block",
  resultActions: ".status-result-actions",
  substageFlow: ".status-substage-flow",
});

export const STATUS_CARD_ACTION_IDS = Object.freeze({
  pdf: STATUS_CARD_IDS.pdfButton,
  reader: STATUS_CARD_IDS.readerButton,
  sourcePdf: STATUS_CARD_IDS.sourcePdfButton,
  markdownBundle: STATUS_CARD_IDS.markdownBundleButton,
});

export const STATUS_CARD_PROTECTED_ARTIFACT_IDS = Object.freeze([
  STATUS_CARD_IDS.markdownBundleButton,
  STATUS_CARD_IDS.sourcePdfButton,
  STATUS_CARD_IDS.pdfButton,
  STATUS_CARD_IDS.legacyBundleButton,
  STATUS_CARD_IDS.legacyMarkdownJsonButton,
  STATUS_CARD_IDS.legacyMarkdownRawButton,
]);

export function idSelector(id = "") {
  return `#${id}`;
}

export function statusCardElementById(host, id = "") {
  return host?.querySelector?.(idSelector(id)) || null;
}
