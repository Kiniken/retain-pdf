import {
  clampRuntimeStageKeyForJob,
  firstNonEmpty,
  isJobTerminal,
  isTerminalStatus,
  normalizeRuntimeDisplayStage,
  numberOrNull,
} from "./runtime-value-helpers.js";

const EMPTY_STAGE_SNAPSHOT = Object.freeze({
  stageKey: "",
  source: "missing-stage-adapter",
  publicStage: "",
  lane: "",
  substage: "",
  detail: "",
  progress: {},
});

const IGNORED_SNAPSHOT_SOURCES = new Set(["legacy-stage", "canonical-empty-stage"]);
const PUBLIC_STAGE_KEYS = new Set(["ocr", "translate", "render", "done"]);

function isMeaningfulStageKey(value = "") {
  return !["", "idle", "running", "queued"].includes(`${value || ""}`.trim());
}

function publicStageName(stageKey = "") {
  return stageKey === "translate" ? "translation" : stageKey;
}

function normalizePublicStageKey(value = "") {
  const normalized = normalizeRuntimeDisplayStage(value);
  return PUBLIC_STAGE_KEYS.has(normalized) ? normalized : "";
}

function snapshotCanDriveStage(snapshot = {}) {
  const source = `${snapshot?.source || ""}`.trim();
  return !IGNORED_SNAPSHOT_SOURCES.has(source);
}

function directPublicStageKey(job = {}) {
  return normalizePublicStageKey(job.display_stage);
}

function snapshotHasPublicStage(stageSnapshot = {}) {
  return Boolean(normalizePublicStageKey(stageSnapshot.publicStage) || normalizePublicStageKey(stageSnapshot.stageKey));
}

function valueOrPrevious(value, previousValue) {
  return value === undefined || value === null || value === "" ? previousValue : value;
}

function runtimeStatusFromSnapshot(stageSnapshot = {}, {
  previousRuntimeStatus = {},
  stage = "",
  stageDetail = "",
  progress = {},
  isBackgroundPatch = false,
} = {}) {
  if (isBackgroundPatch) {
    return previousRuntimeStatus && typeof previousRuntimeStatus === "object"
      ? { ...previousRuntimeStatus }
      : {};
  }
  return {
    stageKey: stage,
    publicStage: stageSnapshot.publicStage,
    source: stageSnapshot.source,
    lane: stageSnapshot.lane,
    substage: stageSnapshot.substage,
    detail: stageDetail,
    progress: { ...progress },
  };
}

function stageSnapshotForJob(job = {}, stageAdapterPort = {}) {
  const displayStageKey = clampRuntimeStageKeyForJob(directPublicStageKey(job), job);
  if (displayStageKey) {
    const adaptJobStageSnapshot = stageAdapterPort.adaptJobStageSnapshot;
    const adapted = typeof adaptJobStageSnapshot === "function"
      ? adaptJobStageSnapshot(job)
      : null;
    return {
      stageKey: displayStageKey,
      source: "display-stage",
      publicStage: publicStageName(displayStageKey),
      lane: firstNonEmpty(job.lane, "main"),
      substage: firstNonEmpty(job.substage),
      detail: firstNonEmpty(adapted?.detail, job.stage_detail),
      progress: adapted?.progress || (job.progress && typeof job.progress === "object" ? job.progress : {}),
    };
  }
  if (job.stage_snapshot && typeof job.stage_snapshot === "object" && snapshotCanDriveStage(job.stage_snapshot)) {
    const snapshot = job.stage_snapshot;
    const clampedStageKey = clampRuntimeStageKeyForJob(snapshot.stageKey, job);
    const clampedPublicStage = clampRuntimeStageKeyForJob(
      normalizePublicStageKey(snapshot.publicStage),
      job,
    );
    if (clampedStageKey === snapshot.stageKey
        && clampedPublicStage === normalizePublicStageKey(snapshot.publicStage)) {
      return snapshot;
    }
    return {
      ...snapshot,
      stageKey: clampedStageKey,
      publicStage: clampedPublicStage
        ? publicStageName(clampedPublicStage)
        : snapshot.publicStage,
    };
  }
  const adaptJobStageSnapshot = stageAdapterPort.adaptJobStageSnapshot;
  const adapted = typeof adaptJobStageSnapshot === "function"
    ? adaptJobStageSnapshot(job)
    : EMPTY_STAGE_SNAPSHOT;
  return snapshotCanDriveStage(adapted) ? adapted : EMPTY_STAGE_SNAPSHOT;
}

export function buildRecentJobRuntimeSnapshot(job = {}, { stageAdapterPort = {} } = {}) {
  const stageSnapshot = stageSnapshotForJob(job, stageAdapterPort);
  return {
    stageKey: stageSnapshot.stageKey,
    source: stageSnapshot.source,
    publicStage: stageSnapshot.publicStage,
    lane: stageSnapshot.lane,
    substage: stageSnapshot.substage,
    detail: stageSnapshot.detail,
    progress: stageSnapshot.progress || {},
  };
}

export function mergeLibraryJobItem(previousItem = {}, job = {}, { stageAdapterPort = {} } = {}) {
  const jobId = firstNonEmpty(job.job_id, previousItem.job_id);
  const stageSnapshot = buildRecentJobRuntimeSnapshot(job, { stageAdapterPort });
  const hasPublicStage = snapshotHasPublicStage(stageSnapshot);
  const isBackgroundPatch = hasPublicStage && stageSnapshot.lane === "background";
  const previousRuntimeStatus = previousItem.runtime_status && typeof previousItem.runtime_status === "object"
    ? previousItem.runtime_status
    : {};
  const stageKey = stageSnapshot.stageKey;
  const stageFallback = stageSnapshot.source === "canonical-empty-stage"
    ? previousItem.stage
    : previousItem.stage;
  const stage = isMeaningfulStageKey(stageKey)
    ? stageKey
    : stageFallback;
  const summarizedDetail = stageSnapshot.detail;
  const stageDetail = isBackgroundPatch
    ? firstNonEmpty(previousItem.stage_detail, job.stage_detail)
    : summarizedDetail && summarizedDetail !== "等待任务开始"
    ? summarizedDetail
    : previousItem.stage_detail;
  const previousProgress = previousItem.progress && typeof previousItem.progress === "object"
    ? previousItem.progress
    : {};
  const progress = isBackgroundPatch
    ? { ...previousProgress }
    : {
        ...previousProgress,
        current: valueOrPrevious(stageSnapshot.progress.current, previousProgress.current),
        total: valueOrPrevious(stageSnapshot.progress.total, previousProgress.total),
        percent: valueOrPrevious(stageSnapshot.progress.percent, previousProgress.percent),
        unit: valueOrPrevious(stageSnapshot.progress.unit, previousProgress.unit),
      };
  if (isJobTerminal(job) && job.status === "succeeded") {
    progress.percent = 100;
    if (progress.total !== undefined && progress.total !== null) {
      progress.current = progress.total;
    }
  } else if (isJobTerminal(job) || (isTerminalStatus(job.status) && job.status !== "succeeded")) {
    progress.percent = valueOrPrevious(stageSnapshot.progress.percent, previousProgress.percent);
  }
  const runtimeStatus = runtimeStatusFromSnapshot(stageSnapshot, {
    previousRuntimeStatus,
    stage,
    stageDetail,
    progress,
    isBackgroundPatch,
  });
  const nextRuntimeStatus = hasPublicStage ? runtimeStatus : { ...previousRuntimeStatus };
  return {
    ...previousItem,
    job_id: jobId,
    id: previousItem.id || jobId,
    status: firstNonEmpty(job.status, previousItem.status),
    stage,
    display_stage: isBackgroundPatch
      ? previousItem.display_stage
      : hasPublicStage
        ? firstNonEmpty(stageSnapshot.publicStage, previousItem.display_stage)
        : previousItem.display_stage,
    lane: isBackgroundPatch
      ? previousItem.lane
      : hasPublicStage
        ? firstNonEmpty(stageSnapshot.lane, previousItem.lane)
        : previousItem.lane,
    substage: isBackgroundPatch
      ? previousItem.substage
      : hasPublicStage
        ? firstNonEmpty(stageSnapshot.substage, previousItem.substage)
        : previousItem.substage,
    background_stages: isBackgroundPatch
      ? [
          {
            display_stage: stageSnapshot.publicStage,
            stage: stageSnapshot.stageKey,
            substage: stageSnapshot.substage,
            lane: stageSnapshot.lane,
            progress: stageSnapshot.progress,
            stage_detail: stageSnapshot.detail,
          },
        ]
      : (Array.isArray(job.background_stages) ? job.background_stages : previousItem.background_stages),
    stage_detail: stageDetail,
    workflow: firstNonEmpty(job.workflow, job.job_type, previousItem.workflow),
    job_type: firstNonEmpty(job.job_type, job.workflow, previousItem.job_type),
    title: firstNonEmpty(job.title, job.display_name, previousItem.title),
    display_name: firstNonEmpty(job.display_name, job.title, previousItem.display_name),
    source_file_name: firstNonEmpty(job.source_file_name, job.book_summary?.source_file_name, previousItem.source_file_name),
    page_count: valueOrPrevious(numberOrNull(job.page_count ?? job.book_summary?.page_count), previousItem.page_count),
    cover_url: firstNonEmpty(job.cover_url, previousItem.cover_url),
    thumbnail_url: firstNonEmpty(job.thumbnail_url, previousItem.thumbnail_url),
    updated_at: firstNonEmpty(job.updated_at, previousItem.updated_at),
    progress,
    runtime_status: nextRuntimeStatus,
  };
}

export function createLibraryJobItemFromRuntime(job = {}, { stageAdapterPort = {} } = {}) {
  const jobId = firstNonEmpty(job.job_id);
  if (!jobId) {
    return null;
  }
  return mergeLibraryJobItem({
    id: jobId,
    job_id: jobId,
    title: jobId,
    display_name: jobId,
    source_file_name: "",
    page_count: null,
    status: "queued",
    stage: "queued",
    stage_detail: "任务已提交",
    progress: {},
    created_at: job.created_at || new Date().toISOString(),
    updated_at: job.updated_at || new Date().toISOString(),
  }, job, { stageAdapterPort });
}

export function mergeRuntimePatches(items, patches, { stageAdapterPort = {} } = {}) {
  return (Array.isArray(items) ? items : []).map((item) => {
    const jobId = firstNonEmpty(item?.job_id);
    const patch = jobId ? patches.get(jobId) : null;
    return patch ? mergeLibraryJobItem(item, patch, { stageAdapterPort }) : item;
  });
}
