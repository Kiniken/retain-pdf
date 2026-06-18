import { isRecentJobActive } from "./card-presenter.js";
import { invalidateRecentJobImages } from "./image-refresh.js";
import { isPrimaryRecentJob } from "./pagination.js";
import {
  createLibraryJobItemFromRuntime,
  mergeLibraryJobItem,
  mergeRuntimePatches,
} from "./runtime-item.js";
import {
  clampRuntimeStageKeyForJob,
  firstNonEmpty,
  isJobTerminal,
  isTerminalStatus,
  normalizeRuntimeDisplayStage,
  numberOrNull,
} from "./runtime-value-helpers.js";

const IGNORED_SNAPSHOT_SOURCES = new Set(["legacy-stage", "canonical-empty-stage"]);
const PATCH_STAGE_KEYS = new Set(["ocr", "translate", "render", "done"]);

function normalizedPatchStage(value = "") {
  const normalized = normalizeRuntimeDisplayStage(value);
  return PATCH_STAGE_KEYS.has(normalized) ? normalized : "";
}

function trustedStageSnapshot(job = {}, stageAdapterPort = {}) {
  const snapshot = job?.stage_snapshot && typeof job.stage_snapshot === "object"
    ? job.stage_snapshot
    : typeof stageAdapterPort.adaptJobStageSnapshot === "function"
      ? stageAdapterPort.adaptJobStageSnapshot(job)
      : null;
  const source = `${snapshot?.source || ""}`.trim();
  return snapshot && !IGNORED_SNAPSHOT_SOURCES.has(source) ? snapshot : null;
}

function stageKeyForPatch(job = {}, stageAdapterPort = {}) {
  const rawStage = normalizedPatchStage(job.display_stage)
    || normalizedPatchStage(trustedStageSnapshot(job, stageAdapterPort)?.publicStage)
    || normalizedPatchStage(trustedStageSnapshot(job, stageAdapterPort)?.stageKey);
  return clampRuntimeStageKeyForJob(rawStage, job);
}

function progressOfPatch(job = {}) {
  const progress = job?.progress && typeof job.progress === "object"
    ? job.progress
    : job?.stage_snapshot?.progress;
  return progress && typeof progress === "object" ? progress : {};
}

function shouldKeepPreviousRuntimePatch(previous = {}, next = {}, { stageAdapterPort = {} } = {}) {
  if (!previous || !next) {
    return false;
  }
  if (isJobTerminal(next) || (isTerminalStatus(next.status) && next.status !== "succeeded")) {
    return false;
  }
  if (isJobTerminal(previous) && !isJobTerminal(next)) {
    return true;
  }
  if (`${next.status || ""}`.trim() === "queued" && isRecentJobActive(previous)) {
    return true;
  }
  const previousStage = stageKeyForPatch(previous, stageAdapterPort);
  const nextStage = stageKeyForPatch(next, stageAdapterPort);
  if (!previousStage || !nextStage || previousStage !== nextStage) {
    return false;
  }
  const previousProgress = progressOfPatch(previous);
  const nextProgress = progressOfPatch(next);
  const previousUnit = firstNonEmpty(previousProgress.unit, previous.progress_unit);
  const nextUnit = firstNonEmpty(nextProgress.unit, next.progress_unit);
  if (!previousUnit || !nextUnit || previousUnit !== nextUnit) {
    return false;
  }
  const previousTotal = numberOrNull(previousProgress.total ?? previous.progress_total);
  const nextTotal = numberOrNull(nextProgress.total ?? next.progress_total);
  if (previousTotal === null || nextTotal === null || previousTotal !== nextTotal || previousTotal <= 0) {
    return false;
  }
  const previousCurrent = numberOrNull(previousProgress.current ?? previous.progress_current);
  const nextCurrent = numberOrNull(nextProgress.current ?? next.progress_current);
  return previousCurrent !== null && nextCurrent !== null && previousCurrent > nextCurrent;
}

function mergeRuntimePatch(previous = null, next = {}, { stageAdapterPort = {} } = {}) {
  if (!previous || !shouldKeepPreviousRuntimePatch(previous, next, { stageAdapterPort })) {
    return next;
  }
  const previousProgress = progressOfPatch(previous);
  const previousTerminal = isJobTerminal(previous) && !isJobTerminal(next);
  const previousActiveOverQueued = `${next.status || ""}`.trim() === "queued" && isRecentJobActive(previous);
  const keepPreviousRuntimeState = previousTerminal || previousActiveOverQueued;
  const nextStageSnapshot = next.stage_snapshot && typeof next.stage_snapshot === "object"
    ? {
      ...next.stage_snapshot,
      progress: {
        ...(next.stage_snapshot.progress && typeof next.stage_snapshot.progress === "object"
          ? next.stage_snapshot.progress
          : {}),
        ...previousProgress,
      },
    }
    : null;
  return {
    ...next,
    ...(keepPreviousRuntimeState
      ? {
        status: previous.status,
        display_stage: previous.display_stage ?? next.display_stage,
        stage: previous.stage ?? next.stage,
        substage: previous.substage ?? next.substage,
        lane: previous.lane ?? next.lane,
        stage_detail: previous.stage_detail ?? next.stage_detail,
      }
      : {}),
    stage_snapshot: keepPreviousRuntimeState ? previous.stage_snapshot || next.stage_snapshot : nextStageSnapshot || next.stage_snapshot,
    progress: {
      ...(next.progress && typeof next.progress === "object" ? next.progress : {}),
      ...previousProgress,
    },
    progress_current: previousProgress.current ?? previous.progress_current ?? next.progress_current,
    progress_total: previousProgress.total ?? previous.progress_total ?? next.progress_total,
    progress_unit: previousProgress.unit ?? previous.progress_unit ?? next.progress_unit,
  };
}

export function createRecentJobsRuntimePatches({
  renderCurrentRecentJobs,
  replaceRecentJobCard,
  scheduleActiveRefresh,
  stageAdapterPort,
  statePort,
  storeDrivenRendering = false,
}) {
  const runtimeJobPatches = new Map();
  const runtimeCreatedJobIds = new Set();

  function apply(items) {
    const mergedItems = mergeRuntimePatches(items, runtimeJobPatches, { stageAdapterPort });
    const presentJobIds = new Set(
      mergedItems
        .map((item) => `${item?.job_id || ""}`.trim())
        .filter(Boolean),
    );
    const missingCreatedItems = Array.from(runtimeCreatedJobIds)
      .filter((jobId) => !presentJobIds.has(jobId))
      .map((jobId) => createLibraryJobItemFromRuntime(runtimeJobPatches.get(jobId), { stageAdapterPort }))
      .filter(Boolean);
    return [...missingCreatedItems, ...mergedItems];
  }

  function applyExisting(items) {
    return mergeRuntimePatches(items, runtimeJobPatches, { stageAdapterPort });
  }

  function update(job) {
    const jobId = `${job?.job_id || ""}`.trim();
    if (!jobId) {
      return;
    }
    const patch = mergeRuntimePatch(runtimeJobPatches.get(jobId), job, { stageAdapterPort });
    runtimeJobPatches.set(jobId, patch);
    const state = statePort.getSnapshot();
    const index = state.items.findIndex((item) => `${item?.job_id || ""}`.trim() === jobId);
    if (index < 0) {
      if (isRecentJobActive(patch)) {
        insert(patch);
      }
      return;
    }
    const nextItems = [...state.items];
    const nextItem = mergeLibraryJobItem(nextItems[index], patch, { stageAdapterPort });
    invalidateRecentJobImages(nextItems[index], nextItem);
    statePort.replaceItem(nextItem);
    if (!storeDrivenRendering && !replaceRecentJobCard(nextItem)) {
      renderCurrentRecentJobs({ reset: true });
    }
    scheduleActiveRefresh?.({ resetTimer: false });
  }

  function insert(job) {
    if (!isPrimaryRecentJob(job)) {
      return;
    }
    const nextItem = createLibraryJobItemFromRuntime(job, { stageAdapterPort });
    if (!nextItem) {
      return;
    }
    runtimeJobPatches.set(nextItem.job_id, job);
    runtimeCreatedJobIds.add(nextItem.job_id);
    const state = statePort.getSnapshot();
    statePort.prependItem(nextItem);
    statePort.setHasMore(state.hasMore);
    if (!storeDrivenRendering) {
      renderCurrentRecentJobs({ reset: true });
    }
    scheduleActiveRefresh?.({ resetTimer: false });
  }

  return {
    apply,
    applyExisting,
    insert,
    update,
  };
}
