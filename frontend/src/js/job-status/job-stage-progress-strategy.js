import { selectStageProgressRecord } from "./stage-progress-selection.js";
import { buildStageProgressViewData } from "./stage-progress-view-data.js";

export function resolveStageProgressStrategy({
  job,
  eventsPayload,
  stageKey,
  eventPayload,
  eventProgress,
  eventProgressText,
  eventSubstageKey,
  eventRecord,
  stageFallback,
}) {
  const latestCurrentProgress = selectStageProgressRecord({
    job,
    eventsPayload,
    stageKey,
    eventSubstageKey,
    currentEventRecord: eventRecord,
  });
  return buildStageProgressViewData({
    latestCurrentProgress,
    stageKey,
    eventPayload,
    eventProgress,
    eventProgressText,
    eventSubstageKey,
    stageFallback,
  });
}
