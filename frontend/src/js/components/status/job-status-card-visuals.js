import { STAGE_ANIMATIONS } from "./job-status-card-presets.js";
import {
  isSelectableStatusStage,
} from "../../job-status/stage-flow-model.js";

export function resolveVisualStageKeyForSnapshot(snapshot = null, selectedStageKey = "") {
  const stageKey = `${snapshot?.stageKey || ""}`.trim();
  const visualStageKey = `${snapshot?.visualStageKey || ""}`.trim();
  const selected = `${selectedStageKey || ""}`.trim();
  if (!selected || selected === stageKey) {
    return visualStageKey || stageKey;
  }
  return selected;
}

export function resolveAnimationPathForStage(stageKey = "") {
  return STAGE_ANIMATIONS[`${stageKey || ""}`.trim()] || "";
}

export function isSelectableStage(stageKey, currentStageKey) {
  return isSelectableStatusStage(stageKey, currentStageKey);
}
