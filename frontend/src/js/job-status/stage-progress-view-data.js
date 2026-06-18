import { stageSubtypeOf } from "./job-status-summary.js";
import { progressTextForStageProgress } from "./job-status-summary-progress.js";
import { publicProgressOf } from "./job-stage-progress-adapter.js";
import { substageMatchesStage } from "./job-stage-presentation-helpers.js";

export function progressPayloadFromRecord(latestCurrentProgress) {
  return latestCurrentProgress
    ? {
        ...latestCurrentProgress.payload,
        progress_unit: latestCurrentProgress.progressUnit || latestCurrentProgress.payload?.progress_unit || "",
        progress_current: latestCurrentProgress.current,
        progress_total: latestCurrentProgress.total,
      }
    : null;
}

function currentProgressIndeterminate({
  latestCurrentProgress,
  stageKey,
  eventProgress,
  stageFallback,
}) {
  if (latestCurrentProgress) {
    return latestCurrentProgress.total !== null
      && (
        (stageKey === "ocr" && latestCurrentProgress.current === null)
        || (stageKey === "render" && latestCurrentProgress.current === 0)
      );
  }
  return eventProgress.current === null && eventProgress.total === null && Boolean(stageFallback);
}

export function buildStageProgressViewData({
  latestCurrentProgress,
  stageKey,
  eventPayload,
  eventProgress,
  eventProgressText,
  eventSubstageKey,
  stageFallback,
}) {
  const latestProgressPayload = progressPayloadFromRecord(latestCurrentProgress);
  const progressPayload = latestProgressPayload || eventPayload;
  const publicEventProgress = publicProgressOf(eventPayload);
  const rawSubstageKey = latestCurrentProgress?.substageKey || eventSubstageKey || stageSubtypeOf(progressPayload);
  const substageKey = substageMatchesStage(stageKey, rawSubstageKey) ? rawSubstageKey : "";
  const latestProgressText = latestCurrentProgress
    ? progressTextForStageProgress({
        stageKey,
        substageKey,
        progress: {
          current: latestCurrentProgress.current,
          total: latestCurrentProgress.total,
          percent: latestCurrentProgress.progressPercent,
          unit: latestCurrentProgress.progressUnit,
        },
      })
    : "";
  return {
    latestCurrentProgress,
    progressPayload,
    visualPayload: progressPayload,
    substagePayload: progressPayload,
    progressText: latestCurrentProgress?.progressText
      || latestProgressText
      || eventProgressText
      || stageFallback?.text
      || "",
    progressCurrent: latestCurrentProgress?.current ?? eventProgress?.current ?? publicEventProgress.current,
    progressTotal: latestCurrentProgress?.total ?? eventProgress?.total ?? publicEventProgress.total,
    progressPercent: latestCurrentProgress?.progressPercent ?? publicEventProgress.percent,
    displayPercent: latestCurrentProgress?.displayPercent ?? null,
    progressUnit: latestCurrentProgress?.progressUnit || publicEventProgress.unit || "",
    substageKey,
    progressIndeterminate: currentProgressIndeterminate({
      latestCurrentProgress,
      stageKey,
      eventProgress,
      stageFallback,
    }),
  };
}
