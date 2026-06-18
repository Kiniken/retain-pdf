import {
  buildJobStatusSummaryViewModel,
} from "../job-status/job-status-summary-view-model.js";
import {
  setInputValueView,
  setTextView,
} from "./presentation-view.js";

export function renderJobStatusSummary(job, stagePresentation) {
  const viewModel = buildJobStatusSummaryViewModel(job, stagePresentation);
  setTextView("job-id", viewModel.fields.jobId);
  setTextView("job-summary", viewModel.fields.statusSummary);
  setTextView("job-stage-detail", viewModel.fields.stageDetail);
  setTextView("job-finished-at", viewModel.fields.finishedAt);
  setTextView("query-job-finished-at", viewModel.fields.queryFinishedAt);
  setInputValueView("job-id-input", viewModel.fields.jobIdInput);
  setTextView("error-box", viewModel.errorText);
  return {
    publicErrorText: viewModel.publicErrorText,
    viewModel,
  };
}
