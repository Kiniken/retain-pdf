import {
  summarizeStageKey,
  stageSubtypeOf,
} from "./job-status-summary.js";
import { eventLooksLikeRender } from "./job-stage-render-detection.js";
import { progressFromEvent } from "./job-stage-event-progress.js";
import {
  canonicalStageOf,
  eventLaneOf,
  isMainLaneEvent,
  normalizeUserStage,
  publicStageOf,
  stageRank,
} from "./job-stage-presentation-utils.js";
import { eventLooksLikeRenderPreprocess } from "./job-stage-render-detection.js";

function strongestStageKey(...payloads) {
  return payloads
    .map((payload) => summarizeStageKey(payload || {}))
    .filter(Boolean)
    .reduce((best, key) => stageRank(key) > stageRank(best) ? key : best, "");
}

export function keepForwardStageKey(job, eventPayload, eventsPayload) {
  const publicJobStageKey = publicStageOf(job);
  if (publicJobStageKey) {
    return publicJobStageKey;
  }
  const jobStageKey = strongestStageKey(job, eventsPayload?.live_stage);
  const eventStageKey = summarizeStageKey(eventPayload);
  return stageRank(eventStageKey) >= stageRank(jobStageKey) ? eventStageKey : jobStageKey;
}

export function latestStageEvent(job, eventsPayload) {
  const items = Array.isArray(eventsPayload?.items) ? eventsPayload.items : [];
  const currentStage = `${job?.current_stage || job?.stage || ""}`.trim();
  const publicJobStageKey = publicStageOf(job);
  const currentStageKey = publicJobStageKey || summarizeStageKey(job);
  const shouldUseEventAsMainStage = (item = {}, itemStageKey = "") => {
    if (!isMainLaneEvent(item)) {
      return false;
    }
    if (
      currentStageKey === "translate"
      && itemStageKey === "render"
      && (
        eventLaneOf(item) !== "main"
        || eventLooksLikeRenderPreprocess(item)
        || `${item?.stage || item?.payload?.stage || ""}`.trim().toLowerCase() === "render_preprocess"
      )
    ) {
      return false;
    }
    return true;
  };
  const payloadForItem = (item = {}) => {
    const itemStage = `${item.stage || ""}`.trim();
    const providerStage = `${item.provider_stage || ""}`.trim();
    const canonicalStage = canonicalStageOf(item);
    const userStage = canonicalStage || normalizeUserStage(item.user_stage || item.payload?.user_stage || "");
    const itemStageForMatch = canonicalStage || itemStage || providerStage || (eventLooksLikeRender(item)
      ? "rendering"
      : userStage);
    if (!itemStageForMatch) {
      return null;
    }
    const progress = progressFromEvent(item);
    return {
      itemStageForMatch,
      progress,
      payload: {
        ...job,
        display_stage: item.display_stage || item.payload?.display_stage || "",
        current_stage: itemStageForMatch,
        stage_detail: item.stage_detail || "",
        user_stage: userStage,
        substage: item.substage || item.payload?.substage || "",
        progress_current: progress.current,
        progress_total: progress.total,
      },
    };
  };
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index] || {};
    const candidate = payloadForItem(item);
    if (!candidate) {
      continue;
    }
    const itemStageKey = summarizeStageKey(candidate.payload);
    if (!shouldUseEventAsMainStage(item, itemStageKey)) {
      continue;
    }
    if (publicJobStageKey && itemStageKey !== publicJobStageKey) {
      continue;
    }
    if (stageRank(itemStageKey) <= stageRank(currentStageKey)) {
      continue;
    }
    if (!item.stage_detail && candidate.progress.current === null) {
      continue;
    }
    return item;
  }
  const findMatchingEvent = (allowBroadStage, requireProgress = false) => {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index] || {};
      const candidate = payloadForItem(item);
      if (!candidate) {
        continue;
      }
      const { itemStageForMatch, progress, payload: itemPayload } = candidate;
      const itemStageKey = summarizeStageKey(itemPayload);
      if (!shouldUseEventAsMainStage(item, itemStageKey)) {
        continue;
      }
      if (requireProgress && (progress.current === null || progress.total === null)) {
        continue;
      }
      if (publicJobStageKey && itemStageKey !== publicJobStageKey) {
        continue;
      }
      if (currentStage) {
        const exactMatch = itemStageForMatch === currentStage;
        if (!exactMatch && (!allowBroadStage || itemStageKey !== currentStageKey)) {
          continue;
        }
      } else if (currentStageKey && itemStageKey !== currentStageKey) {
        continue;
      }
      if (!item.stage_detail && progress.current === null) {
        continue;
      }
      return item;
    }
    return null;
  };
  const exactEvent = findMatchingEvent(false);
  if (currentStageKey === "ocr" || currentStageKey === "translate" || currentStageKey === "render") {
    const desiredSubstageKey = currentStageKey === "translate"
      ? stageSubtypeOf(eventsPayload?.live_stage || job)
      : "";
    if (desiredSubstageKey) {
      for (let index = items.length - 1; index >= 0; index -= 1) {
        const item = items[index] || {};
        const candidate = payloadForItem(item);
        if (!candidate) {
          continue;
        }
        const itemPayload = candidate.payload;
        if (!shouldUseEventAsMainStage(item, summarizeStageKey(itemPayload))) {
          continue;
        }
        if (summarizeStageKey(itemPayload) === currentStageKey && stageSubtypeOf(itemPayload) === desiredSubstageKey) {
          return item;
        }
      }
    }
    const broadEvent = findMatchingEvent(true, true) || findMatchingEvent(true);
    if (broadEvent) {
      return broadEvent;
    }
  }
  if (exactEvent) {
    return exactEvent;
  }
  return findMatchingEvent(true);
}
