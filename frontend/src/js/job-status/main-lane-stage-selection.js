import {
  summarizeStageKey,
  stageSubtypeOf,
} from "./job-status-summary.js";
import {
  publicSubstageKeyOf,
} from "./job-stage-substage-adapter.js";
import {
  publicStageOf,
  stageRank,
} from "./job-stage-presentation-utils.js";
import {
  normalizedStageEventRecord,
} from "./job-stage-event-record.js";
import {
  eventRecordForMainStatus,
  hasStructuredSelectableSignalRecord,
  publicStageSelectionContext,
} from "./canonical-stage-snapshot.js";

// Backends occasionally emit `display_stage="done"` (or push the same through a
// final-artifact signal) before the job's own status flips to "succeeded".
// Returning "done" here would cascade into the stage-flow card marking every
// previous step done and skipping render. Clamp running jobs to "render".
function clampStageKeyForRunningJob(stageKey, status) {
  if (stageKey === "done" && `${status || ""}`.trim().toLowerCase() !== "succeeded") {
    return "render";
  }
  return stageKey;
}

function stageKeyForSnapshot(payload = {}) {
  const publicStageKey = publicStageOf(payload);
  if (publicStageKey) {
    return publicStageKey;
  }
  return summarizeStageKey(payload || {});
}

function strongestStageKey(...payloads) {
  return payloads
    .map((payload) => stageKeyForSnapshot(payload || {}))
    .filter(Boolean)
    .reduce((best, key) => stageRank(key) > stageRank(best) ? key : best, "");
}

function stageKeyForForwardSelection(eventRecord, eventPayload) {
  if (eventRecord?.hasCanonicalEventContract) {
    return `${eventRecord.canonicalDisplayStage || eventRecord.publicStage || ""}`.trim();
  }
  return summarizeStageKey(eventPayload);
}

function substageKeyForSnapshot(payload = {}) {
  const publicSubstageKey = publicSubstageKeyOf(payload);
  if (publicSubstageKey) {
    return publicSubstageKey;
  }
  return stageSubtypeOf(payload || {});
}

function substageKeyForCandidate(candidate = {}) {
  const record = candidate.record || {};
  const recordSubstage = publicSubstageKeyOf({
    lane: record.lane || "",
    display_stage: record.displayStage || record.canonicalDisplayStage || "",
    substage: record.substage || "",
  });
  if (recordSubstage) {
    return recordSubstage;
  }
  if (record.hasCanonicalEventContract) {
    return "";
  }
  return stageSubtypeOf(candidate.payload || {});
}

function candidateMatchesDesiredSubstage(candidate = {}, desiredSubstageKey = "", currentStageKey = "") {
  if (!candidate || !desiredSubstageKey) {
    return false;
  }
  if (candidate.itemStageKey !== currentStageKey) {
    return false;
  }
  return substageKeyForCandidate(candidate) === desiredSubstageKey;
}

export function keepForwardStageKey(job, eventPayload, eventsPayload, eventRecord = null) {
  const publicJobStageKey = publicStageOf(job);
  if (publicJobStageKey) {
    return clampStageKeyForRunningJob(publicJobStageKey, job?.status);
  }
  const eventStageKey = stageKeyForForwardSelection(eventRecord, eventPayload);
  const jobStageKey = strongestStageKey(job, eventsPayload?.live_stage);
  const candidate = stageRank(eventStageKey) >= stageRank(jobStageKey)
    ? eventStageKey
    : jobStageKey;
  return clampStageKeyForRunningJob(candidate, job?.status);
}

export { eventRecordForMainStatus };

export function latestMainStageEventRecord(job = {}, eventsPayload = {}) {
  const items = Array.isArray(eventsPayload?.items) ? eventsPayload.items : [];
  const records = items.map((item) => normalizedStageEventRecord(item || {}));
  const { publicJobStageKey, currentStageKey } = publicStageSelectionContext(job);
  const candidateForRecord = (record = {}) => {
    return eventRecordForMainStatus(job, record, {
      currentStageKey,
      publicJobStageKey,
    });
  };
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index] || {};
    const candidate = candidateForRecord(record);
    if (!candidate) {
      continue;
    }
    const { itemStageKey } = candidate;
    if (publicJobStageKey && itemStageKey !== publicJobStageKey) {
      continue;
    }
    if (stageRank(itemStageKey) <= stageRank(currentStageKey)) {
      continue;
    }
    if (!hasStructuredSelectableSignalRecord(record) && candidate.progress.current === null) {
      continue;
    }
    return candidate;
  }
  const findMatchingRecord = (allowBroadStage, requireProgress = false) => {
    for (let index = records.length - 1; index >= 0; index -= 1) {
      const record = records[index] || {};
      const candidate = candidateForRecord(record);
      if (!candidate) {
        continue;
      }
      const { itemStageForMatch, itemStageKey, progress } = candidate;
      if (record.hasStructuredPublicStage && !record.hasStructuredProgress && progress.current === null) {
        continue;
      }
      if (requireProgress && (progress.current === null || progress.total === null)) {
        continue;
      }
      if (publicJobStageKey && itemStageKey !== publicJobStageKey) {
        continue;
      }
      if (currentStageKey && itemStageKey !== currentStageKey) {
        continue;
      }
      if (!hasStructuredSelectableSignalRecord(record) && progress.current === null) {
        continue;
      }
      return candidate;
    }
    return null;
  };
  const exactEvent = findMatchingRecord(false);
  if (currentStageKey === "ocr" || currentStageKey === "translate" || currentStageKey === "render") {
    const desiredSubstageKey = currentStageKey === "translate" && eventsPayload?.live_stage
      ? substageKeyForSnapshot(eventsPayload.live_stage)
      : "";
    if (desiredSubstageKey) {
      for (let index = records.length - 1; index >= 0; index -= 1) {
        const record = records[index] || {};
        const candidate = candidateForRecord(record);
        if (!candidate) {
          continue;
        }
        if (candidateMatchesDesiredSubstage(candidate, desiredSubstageKey, currentStageKey)) {
          return candidate;
        }
      }
    }
    const broadEvent = findMatchingRecord(true, true) || findMatchingRecord(true);
    if (broadEvent) {
      return broadEvent;
    }
  }
  if (exactEvent) {
    return exactEvent;
  }
  return findMatchingRecord(true);
}
