import {
  buildReaderPageUrl,
  isReaderActionEnabled,
} from "../job/action-model.js";
import { buildJobActionButtonsViewModel } from "./job-actions-view-model.js";
import {
  clearFileInputValueView,
  resetUploadedFileView,
  resetUploadProgressView,
  setActionLinkView,
  setLinearProgressView,
  setStatusCardCancelEnabled,
  syncStatusCardPrimaryActionsView,
  setUploadProgressView,
} from "./job-actions-view.js";
import { STATUS_CARD_IDS } from "../components/status/job-status-card-dom-contract.js";
import { DOWNLOAD_ACTION_IDS } from "../contracts/download-action-contract.js";
import { defaultJobActionsRuntime } from "./default-job-actions-runtime.js";

const jobActionsRuntime = defaultJobActionsRuntime;

export function setActionLink(id, url, enabled) {
  setActionLinkView(id, url, enabled);
}

export { buildReaderPageUrl, isReaderActionEnabled };

export function updateActionButtons(job, manifestPayload = null) {
  const viewModel = buildJobActionButtonsViewModel(job, manifestPayload);
  setActionLink(STATUS_CARD_IDS.legacyBundleButton, viewModel.legacyBundle.url, viewModel.legacyBundle.enabled);
  setActionLink(DOWNLOAD_ACTION_IDS.MARKDOWN_BUNDLE, viewModel.markdownBundle.url, viewModel.markdownBundle.enabled);
  setActionLink(STATUS_CARD_IDS.legacyMarkdownJsonButton, viewModel.markdownJson.url, viewModel.markdownJson.enabled);
  setActionLink(STATUS_CARD_IDS.legacyMarkdownRawButton, viewModel.markdownRaw.url, viewModel.markdownRaw.enabled);
  setActionLink("compare-reader-btn", viewModel.compareReader.url, viewModel.compareReader.enabled);
  syncStatusCardPrimaryActionsView(viewModel.statusCardPrimaryActions);
  setStatusCardCancelEnabled(viewModel.statusCardTaskActions.cancelEnabled);
}

export function setLinearProgress(barId, textId, current, total, fallbackText = "-", percentOverride = null) {
  setLinearProgressView(barId, textId, current, total, fallbackText, percentOverride);
}

export function setUploadProgress(loaded, total) {
  setUploadProgressView(loaded, total);
}

export function resetUploadProgress() {
  resetUploadProgressView();
}

export function clearFileInputValue() {
  clearFileInputValueView();
}

export function resetUploadedFile() {
  jobActionsRuntime.resetUploadedFileState();
  resetUploadedFileView();
}

export function prepareFilePicker() {
  clearFileInputValue();
}
