import {
  summarizeStageDetail,
  summarizeStageLabel,
} from "./job-status-summary.js";
import {
  structuredPublicStageOf,
} from "./job-stage-presentation-utils.js";
import {
  visualStageKeyForPresentation,
} from "./job-stage-presentation-helpers.js";
import { resolveStageProgressStrategy } from "./job-stage-progress-strategy.js";
import {
  buildEventStagePresentationContext,
} from "./stage-presentation-event-context.js";

export function buildEventStagePresentation({
  job,
  eventsPayload,
  event,
  fallback,
  fallbackProgress,
  stageFallback,
}) {
  const {
    eventRecord,
    eventDisplayStage,
    eventProgress,
    eventPayload,
    eventProgressText,
    stageKey,
    labelPayload,
    detailPayload,
    eventSubstageKey,
  } = buildEventStagePresentationContext({
    job,
    eventsPayload,
    event,
    fallback,
    fallbackProgress,
    stageFallback,
  });
  const progressStrategy = resolveStageProgressStrategy({
    job,
    eventsPayload,
    stageKey,
    eventPayload,
    eventProgress,
    eventProgressText,
    eventSubstageKey,
    eventRecord,
    stageFallback,
  });
  return {
    stageKey,
    stageKeyTrusted: Boolean(structuredPublicStageOf(job) || eventDisplayStage),
    visualStageKey: visualStageKeyForPresentation(progressStrategy.visualPayload, stageKey),
    label: summarizeStageLabel(labelPayload || job),
    detail: summarizeStageDetail(detailPayload),
    progressText: progressStrategy.progressText,
    progressCurrent: progressStrategy.progressCurrent,
    progressTotal: progressStrategy.progressTotal,
    progressPercent: progressStrategy.progressPercent,
    displayPercent: progressStrategy.displayPercent,
    progressUnit: progressStrategy.progressUnit,
    substageKey: progressStrategy.substageKey,
    progressIndeterminate: progressStrategy.progressIndeterminate,
  };
}
