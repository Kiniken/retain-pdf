import {
  resolveJobActions,
  resolveJobMarkdownBundleAction,
  resolveJobSourcePdfAction,
} from "../job/actions.js";
import { buildReaderPageUrl } from "../job/action-model.js";
import { buildStatusCardResultActions } from "../job-status/status-card-result-actions-view-model.js";
import { buildStatusCardTaskActions } from "../job-status/status-card-task-actions-view-model.js";

export function buildJobActionButtonsViewModel(job, manifestPayload = null) {
  const actions = resolveJobActions(job);
  const markdownBundleAction = resolveJobMarkdownBundleAction(job, manifestPayload);
  const sourcePdfAction = resolveJobSourcePdfAction(job, manifestPayload);
  const statusCardResultActions = buildStatusCardResultActions({
    job,
    manifest: manifestPayload,
  });
  const statusCardTaskActions = buildStatusCardTaskActions({ job });
  const readerUrl = buildReaderPageUrl(job?.job_id);
  return {
    legacyBundle: {
      url: actions.bundle,
      enabled: actions.bundleEnabled && Boolean(actions.bundle),
    },
    markdownBundle: {
      url: markdownBundleAction.url,
      enabled: markdownBundleAction.ready && Boolean(markdownBundleAction.url),
    },
    sourcePdf: {
      url: sourcePdfAction.url,
      enabled: sourcePdfAction.ready && Boolean(sourcePdfAction.url),
    },
    pdf: {
      url: statusCardResultActions.pdfUrl,
      enabled: statusCardResultActions.pdfReady,
    },
    markdownJson: {
      url: actions.markdownJson,
      enabled: actions.markdownJsonEnabled && Boolean(actions.markdownJson),
    },
    markdownRaw: {
      url: actions.markdownRaw,
      enabled: actions.markdownRawEnabled && Boolean(actions.markdownRaw),
    },
    reader: {
      url: statusCardResultActions.readerUrl || readerUrl,
      enabled: statusCardResultActions.readerReady,
    },
    compareReader: {
      url: statusCardResultActions.readerUrl || readerUrl,
      enabled: statusCardResultActions.readerReady,
    },
    statusCardPrimaryActions: statusCardResultActions,
    statusCardTaskActions,
  };
}
