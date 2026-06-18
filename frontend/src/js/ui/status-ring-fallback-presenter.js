import { resolveDisplayedStagePresentation } from "../job-status/job-stage-presentation.js";
import { resolveJobActions } from "../job/actions.js";
import { isReaderActionEnabled } from "../job/action-model.js";
import { isJobTerminal } from "../job/core.js";
import { renderStatusRingFallback } from "./presentation-view.js";

export function renderLegacyStatusRing(job, events) {
  const presentation = resolveDisplayedStagePresentation(job, events);
  const stageText = presentation.detail;
  const actions = resolveJobActions(job);
  const succeeded = isJobTerminal(job) && job.status === "succeeded";
  renderStatusRingFallback({
    label: presentation.label,
    value: stageText || "准备中",
    stageKey: presentation.stageKey,
    pdfReady: actions.pdfEnabled && !!actions.pdf && succeeded,
    readerReady: isReaderActionEnabled(job) && succeeded,
  });
}
