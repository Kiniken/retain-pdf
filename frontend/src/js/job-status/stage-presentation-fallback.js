import {
  summarizeStageDetail,
  summarizeStageKey,
  summarizeStageLabel,
  summarizeStageProgressText,
  stageSubtypeOf,
} from "./job-status-summary.js";
import {
  structuredPublicStageOf,
} from "./job-stage-presentation-utils.js";
import {
  hasCanonicalEventContract,
} from "./job-stage-event-contract.js";
import {
  publicProgressOf,
} from "./job-stage-progress-adapter.js";
import {
  jobProgress,
  jobProgressRecord,
  stageFallbackProgress,
} from "./job-stage-job-progress.js";
import {
  substageMatchesStage,
  visualStageKeyForPresentation,
} from "./job-stage-presentation-helpers.js";

export function cleanFallbackJobForStage(job = {}, fallbackStageKey = "") {
  return substageMatchesStage(fallbackStageKey, stageSubtypeOf(job))
    ? job
    : { ...job, substage: "", stage: fallbackStageKey === "translate" ? "translating" : job.stage };
}

function publicStageNameForPayload(stageKey = "") {
  return stageKey === "translate" ? "translation" : stageKey;
}

function internalStageForSnapshot(stageKey = "") {
  return stageKey === "translate" ? "translating" : stageKey;
}

function jobWithStageSnapshot(job = {}) {
  const snapshot = job.stage_snapshot && typeof job.stage_snapshot === "object"
    ? job.stage_snapshot
    : null;
  if (!snapshot) {
    return job;
  }
  const stageKey = snapshot.stageKey || "";
  const progress = snapshot.progress && typeof snapshot.progress === "object"
    ? snapshot.progress
    : {};
  return {
    ...job,
    display_stage: snapshot.publicStage || publicStageNameForPayload(stageKey),
    user_stage: snapshot.publicStage || publicStageNameForPayload(stageKey),
    stage: internalStageForSnapshot(stageKey),
    current_stage: "",
    lane: snapshot.lane || "main",
    substage: snapshot.substage || "",
    stage_detail: "",
    progress: {
      unit: progress.unit || "",
      current: progress.current ?? null,
      total: progress.total ?? null,
      percent: progress.percent ?? null,
    },
    progress_unit: progress.unit || "",
    progress_current: progress.current ?? null,
    progress_total: progress.total ?? null,
    progress_percent: progress.percent ?? null,
  };
}

function fallbackDisplayPayloadForJob(job = {}, fallbackStageKey = "") {
  if (!hasCanonicalEventContract(job)) {
    return cleanFallbackJobForStage(job, fallbackStageKey);
  }
  const publicProgress = publicProgressOf(job);
  const rawSubstage = `${job.substage || job.payload?.substage || ""}`.trim();
  const safeSubstage = substageMatchesStage(fallbackStageKey, stageSubtypeOf({
    ...job,
    substage: rawSubstage,
  })) ? rawSubstage : "";
  return {
    status: job.status || "running",
    lane: job.lane || "main",
    display_stage: job.display_stage || job.payload?.display_stage || publicStageNameForPayload(fallbackStageKey),
    user_stage: publicStageNameForPayload(fallbackStageKey),
    stage: fallbackStageKey === "translate" ? "translating" : fallbackStageKey,
    substage: safeSubstage,
    progress: {
      unit: publicProgress.unit || "",
      current: publicProgress.current,
      total: publicProgress.total,
      percent: publicProgress.percent,
    },
  };
}

export function buildFallbackStagePresentation(job = {}) {
  const presentationJob = jobWithStageSnapshot(job);
  const fallbackProgress = jobProgress(presentationJob);
  const publicProgress = publicProgressOf(presentationJob);
  const fallbackPublicStageKey = structuredPublicStageOf(presentationJob);
  const fallbackStageKey = summarizeStageKey(presentationJob);
  const cleanFallbackJob = fallbackDisplayPayloadForJob(presentationJob, fallbackStageKey);
  const stageFallback = stageFallbackProgress(fallbackStageKey, presentationJob);
  const rawFallbackSubstageKey = stageSubtypeOf(presentationJob);
  const fallbackSubstageKey = substageMatchesStage(fallbackStageKey, rawFallbackSubstageKey)
    ? rawFallbackSubstageKey
    : "";
  const fallbackProgressRecord = fallbackStageKey === "translate"
    ? jobProgressRecord(cleanFallbackJob, fallbackStageKey)
    : null;

  return {
    fallbackProgress,
    stageFallback,
    presentation: {
      stageKey: fallbackStageKey,
      stageKeyTrusted: Boolean(fallbackPublicStageKey),
      visualStageKey: visualStageKeyForPresentation(job, fallbackStageKey),
      label: summarizeStageLabel(cleanFallbackJob),
      detail: summarizeStageDetail(cleanFallbackJob),
      progressText: fallbackProgressRecord?.progressText || summarizeStageProgressText(cleanFallbackJob) || stageFallback?.text || "",
      progressCurrent: fallbackProgressRecord?.current ?? fallbackProgress.current ?? stageFallback?.current ?? null,
      progressTotal: fallbackProgressRecord?.total ?? fallbackProgress.total ?? stageFallback?.total ?? null,
      progressPercent: fallbackProgressRecord?.progressPercent ?? publicProgress.percent,
      progressUnit: fallbackProgressRecord?.progressUnit || publicProgress.unit,
      substageKey: fallbackProgressRecord?.substageKey || fallbackSubstageKey,
      progressIndeterminate: fallbackProgress.current === null && fallbackProgress.total === null && Boolean(stageFallback),
    },
  };
}
