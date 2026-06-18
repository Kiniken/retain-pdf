import {
  summarizeStageKey,
} from "./job-status-summary.js";
import { isJobTerminal } from "../job/core.js";
import {
  publicStageOf,
  stageRank,
  normalizeUserStage,
} from "./job-stage-presentation-utils.js";
import {
  eventStageForMatchRecord,
} from "./job-stage-event-record.js";

export function hasStructuredSelectableSignalRecord(record = {}) {
  return record.hasStructuredPublicStage
    || Boolean(`${record.substage || ""}`.trim())
    || record.hasStructuredProgress;
}

function recordHasProgressSignal(record = {}) {
  return record.hasStructuredProgress
    || record.progress?.current !== null
    || record.progress?.total !== null
    || record.progressPercent !== null;
}

function recordHasTerminalSignal(record = {}) {
  return isJobTerminal({
    ...(record.item?.payload || {}),
    ...(record.item || {}),
  });
}

function normalizedRecordStageText(record = {}, key = "") {
  return `${record?.[key] || record?.item?.payload?.[key] || record?.item?.[key] || ""}`.trim().toLowerCase();
}

function recordIsRenderPreprocess(record = {}) {
  const publicStage = `${record.canonicalDisplayStage || record.publicStage || ""}`.trim();
  const substage = normalizedRecordStageText(record, "substage");
  const rawStage = normalizedRecordStageText(record, "stage");
  if (record.hasCanonicalEventContract) {
    return publicStage === "render" && (
      substage === "render_preprocess"
      || substage === "render_prepare"
      || substage === "render_prewarm"
    );
  }
  return rawStage === "render_preprocess"
    || rawStage === "render_prewarm"
    || substage === "render_preprocess"
    || substage === "render_prepare"
    || substage === "render_prewarm";
}

function eventCanReplaceMainStageRecord({
  record,
  itemStageKey,
  currentStageKey,
  publicJobStageKey,
}) {
  if (!record.isMainLane) {
    return false;
  }
  const isForwardStage = stageRank(itemStageKey) > stageRank(currentStageKey);
  if (
    record.hasCanonicalEventContract
    && isForwardStage
    && !recordHasProgressSignal(record)
    && !recordHasTerminalSignal(record)
  ) {
    return false;
  }
  if (publicJobStageKey && itemStageKey !== publicJobStageKey && !isForwardStage) {
    return false;
  }
  const rawStage = `${record.item?.stage || record.item?.payload?.stage || ""}`.trim().toLowerCase();
  if (
    currentStageKey === "translate"
    && itemStageKey === "render"
    && (
      !record.isMainLane
      || recordIsRenderPreprocess(record)
      || (!record.hasStructuredPublicStage && rawStage === "render_preprocess")
    )
  ) {
    return false;
  }
  if (
    currentStageKey
    && ["ocr", "translate", "render"].includes(currentStageKey)
    && itemStageKey
    && itemStageKey !== currentStageKey
    && !isForwardStage
  ) {
    return false;
  }
  return true;
}

function stageKeyForMatchRecord(record = {}, itemStageForMatch = "") {
  const publicStage = normalizeUserStage(record.canonicalDisplayStage || record.publicStage || itemStageForMatch);
  if (["ocr", "translate", "render", "done"].includes(publicStage)) {
    return publicStage;
  }
  if (record.hasCanonicalEventContract) {
    return "";
  }
  return summarizeStageKey({
    status: record.item?.status || "running",
    current_stage: itemStageForMatch || record.rawStage,
    stage: record.item?.stage || record.item?.payload?.stage || record.rawStage,
    user_stage: record.userStage,
    display_stage: record.canonicalDisplayStage,
  });
}

function publicDisplayStageName(stageKey = "") {
  return stageKey === "translate" ? "translation" : stageKey;
}

function structuredMainStagePayload(job = {}, record = {}, {
  itemStageForMatch = "",
  itemStageKey = "",
} = {}) {
  const publicStageName = publicDisplayStageName(itemStageKey);
  const progressUnit = record.progressUnit || record.progress?.unit || "";
  return {
    ...job,
    status: record.item?.status || job.status || "running",
    lane: record.lane || "",
    display_stage: publicStageName,
    user_stage: "",
    current_stage: "",
    stage: "",
    internal_stage: "",
    substage: record.substage || "",
    stage_detail: "",
    progress: {
      unit: progressUnit,
      current: record.progress?.current ?? null,
      total: record.progress?.total ?? null,
      percent: record.progressPercent ?? null,
    },
    progress_unit: progressUnit,
    progress_current: record.progress?.current ?? null,
    progress_total: record.progress?.total ?? null,
    progress_percent: record.progressPercent ?? null,
  };
}

export function canonicalMainStageCandidate(job = {}, record = {}, {
  currentStageKey = "",
  publicJobStageKey = "",
} = {}) {
  const itemStageForMatch = eventStageForMatchRecord(record);
  if (!itemStageForMatch) {
    return null;
  }
  const itemStageKey = stageKeyForMatchRecord(record, itemStageForMatch);
  const payload = structuredMainStagePayload(job, record, {
    itemStageForMatch,
    itemStageKey,
  });
  if (!eventCanReplaceMainStageRecord({
    record,
    itemStageKey,
    currentStageKey,
    publicJobStageKey,
  })) {
    return null;
  }
  return {
    record,
    item: record.item,
    itemStageForMatch,
    itemStageKey,
    progress: record.progress,
    payload,
  };
}

export const eventRecordForMainStatus = canonicalMainStageCandidate;

export function publicStageSelectionContext(job = {}) {
  const publicJobStageKey = publicStageOf(job);
  return {
    publicJobStageKey,
    currentStageKey: publicJobStageKey || summarizeStageKey(job),
  };
}
