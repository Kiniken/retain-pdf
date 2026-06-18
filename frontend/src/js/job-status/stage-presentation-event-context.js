import {
  summarizeStageKey,
  stageSubtypeOf,
} from "./job-status-summary.js";
import {
  progressTextForStageProgress,
} from "./job-status-summary-progress.js";
import {
  keepForwardStageKey,
} from "./job-stage-event-selection.js";
import {
  normalizedStageEventRecord,
  stagePayloadFromEventRecord,
} from "./job-stage-event-record.js";
import {
  substageMatchesStage,
  translationSubstageKeyFromTextPayload,
} from "./job-stage-presentation-helpers.js";
import {
  normalizeSubstageKey,
} from "./job-stage-substage-contract.js";

function publicStageNameForPayload(stageKey = "") {
  return stageKey === "translate" ? "translating" : stageKey;
}

function stageProgressMatches(stageKey, eventRecord, eventPayload) {
  if (!stageKey) {
    return false;
  }
  if (eventRecord?.hasCanonicalEventContract) {
    return eventRecord.canonicalDisplayStage === stageKey;
  }
  return summarizeStageKey(eventPayload) === stageKey;
}

function eventPayloadWithFallbackProgress({
  job,
  eventRecord,
  fallback,
  fallbackProgress,
  stageFallback,
}) {
  const eventProgress = eventRecord.progress;
  const rawEventPayload = stagePayloadFromEventRecord(job, eventRecord);
  const eventMatchesCurrentStage = stageProgressMatches(fallback.stageKey, eventRecord, rawEventPayload);
  const canUseFallbackProgress = !eventRecord.hasCanonicalEventContract && eventMatchesCurrentStage;
  const progress = {
    current: eventProgress.current ?? (canUseFallbackProgress ? fallbackProgress.current : null),
    total: eventProgress.total ?? (canUseFallbackProgress ? fallbackProgress.total : null),
    percent: eventRecord.progressPercent ?? null,
    unit: eventRecord.progressUnit || rawEventPayload.progress?.unit || "",
  };
  return {
    eventProgress,
    progress,
    eventPayload: {
      ...rawEventPayload,
      progress,
      progress_current: progress.current ?? stageFallback?.current ?? null,
      progress_total: progress.total ?? stageFallback?.total ?? null,
      progress_unit: progress.unit || rawEventPayload.progress_unit || "",
    },
  };
}

function eventSubstageKeyForRecord(stageKey = "", eventRecord = {}, eventPayload = {}) {
  const structuredSubstage = normalizeSubstageKey(eventRecord.substage);
  if (structuredSubstage) {
    return substageMatchesStage(stageKey, structuredSubstage) ? structuredSubstage : "";
  }
  if (eventRecord.hasCanonicalEventContract) {
    return "";
  }
  const rawEventSubstageKey = translationSubstageKeyFromTextPayload(eventPayload) || stageSubtypeOf(eventPayload);
  return substageMatchesStage(stageKey, rawEventSubstageKey) ? rawEventSubstageKey : "";
}

function detailPayloadForRecord(stageKey = "", eventSubstageKey = "", eventPayload = {}) {
  if (eventSubstageKey) {
    return {
      ...eventPayload,
      stage: publicStageNameForPayload(stageKey) || eventPayload.stage,
      substage: eventSubstageKey,
    };
  }
  return {
    ...eventPayload,
    substage: "",
    stage: publicStageNameForPayload(stageKey) || eventPayload.stage,
  };
}

function presentationPayloadForRecord(stageKey = "", eventSubstageKey = "", eventPayload = {}, eventRecord = {}) {
  if (!eventRecord.hasCanonicalEventContract) {
    return detailPayloadForRecord(stageKey, eventSubstageKey, eventPayload);
  }
  return {
    status: eventPayload.status || "running",
    lane: eventRecord.lane || "main",
    display_stage: eventRecord.displayStage || "",
    user_stage: eventRecord.canonicalDisplayStage || stageKey || "",
    stage: publicStageNameForPayload(stageKey) || "",
    substage: eventSubstageKey || "",
    progress: {
      unit: eventRecord.progressUnit || eventPayload.progress?.unit || "",
      current: eventRecord.progress?.current ?? eventPayload.progress?.current ?? null,
      total: eventRecord.progress?.total ?? eventPayload.progress?.total ?? null,
    },
  };
}

export function buildEventStagePresentationContext({
  job,
  eventsPayload,
  event,
  fallback,
  fallbackProgress,
  stageFallback,
}) {
  const eventRecord = normalizedStageEventRecord(event);
  const { eventProgress, progress, eventPayload } = eventPayloadWithFallbackProgress({
    job,
    eventRecord,
    fallback,
    fallbackProgress,
    stageFallback,
  });
  const stageKey = keepForwardStageKey(job, eventPayload, eventsPayload, eventRecord);
  const eventSubstageKey = eventSubstageKeyForRecord(stageKey, eventRecord, eventPayload);
  const eventProgressText = progressTextForStageProgress({
    stageKey,
    substageKey: eventSubstageKey,
    progress,
  });
  const presentationPayload = presentationPayloadForRecord(
    stageKey,
    eventSubstageKey,
    eventPayload,
    eventRecord,
  );

  return {
    eventRecord,
    eventDisplayStage: eventRecord.canonicalDisplayStage,
    eventProgress,
    eventPayload,
    eventProgressText,
    stageKey,
    labelPayload: presentationPayload,
    detailPayload: presentationPayload,
    eventSubstageKey,
  };
}
