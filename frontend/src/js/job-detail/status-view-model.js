import {
  resolveDisplayedStagePresentation,
} from "../job-status/job-stage-presentation.js";
import {
  normalizedStageEventRecord,
} from "../job-status/job-stage-event-record.js";
import {
  adaptJobEventStageSnapshot,
} from "../job-status/job-stage-contract-adapter.js";
import {
  summarizeRuntimeField,
} from "../job/formatters.js";

function firstNonEmptyText(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function numberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function runtimeStageText(job = {}, presentation = {}) {
  return firstNonEmptyText(
    presentation.detail,
    presentation.progressText,
    job.stage_snapshot?.publicStage,
    job.display_stage,
  );
}

export function buildJobDetailStatusViewModel(job = {}, eventsPayload = null) {
  const presentation = resolveDisplayedStagePresentation(job, eventsPayload);
  return {
    stageDetail: presentation.detail || "-",
    runtimeCurrentStage: summarizeRuntimeField(runtimeStageText(job, presentation)),
    progressText: presentation.progressText || "",
    stageKey: presentation.stageKey || "",
    visualStageKey: presentation.visualStageKey || presentation.stageKey || "",
  };
}

export function buildJobDetailEventViewModel(item = {}) {
  const record = normalizedStageEventRecord(item);
  const snapshot = adaptJobEventStageSnapshot(item);
  const progressCurrent = numberOrNull(snapshot.progress?.current);
  const progressTotal = numberOrNull(snapshot.progress?.total);
  const progressUnit = `${snapshot.progress?.unit || ""}`.trim();

  return {
    event: item.event || item.raw_event_type || item.event_type || "-",
    level: item.level || "-",
    timestamp: record.timestamp,
    stageText: record.stageText,
    displayStage: snapshot.publicStage || "",
    substage: snapshot.substage || record.substage,
    lane: snapshot.lane || record.lane,
    eventType: item.event_type || "",
    rawEventType: item.raw_event_type || "",
    provider: item.provider || "",
    providerStage: item.provider_stage || "",
    message: item.message || "-",
    payload: item.payload,
    progressCurrent,
    progressTotal,
    progressUnit,
    progressText: record.progressText,
    retryCount: numberOrNull(item?.retry_count),
    elapsedMs: numberOrNull(item?.elapsed_ms),
    seq: item?.seq ?? "-",
  };
}
