import { collectLatestCurrentStageProgress } from "./job-stage-progress-records.js";
import {
  jobProgressRecord,
  shouldPreferJobProgress,
} from "./job-stage-job-progress.js";

export function selectStageProgressRecord({
  job,
  eventsPayload,
  stageKey,
  eventSubstageKey,
  currentEventRecord = null,
}) {
  let latestCurrentProgress = collectLatestCurrentStageProgress(job, eventsPayload, stageKey, eventSubstageKey);
  if (shouldPreferJobProgress(job, stageKey, latestCurrentProgress, { currentEventRecord })) {
    latestCurrentProgress = jobProgressRecord(job, stageKey);
  }
  return latestCurrentProgress;
}
