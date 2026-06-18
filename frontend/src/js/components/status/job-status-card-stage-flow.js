import {
  isSelectableStatusStage,
  resolveSelectedStatusStage,
  STATUS_STAGE_FLOW,
  statusStageIndex,
} from "../../job-status/stage-flow-model.js";

export function syncStageFlow(host, stageKey = "", selectedStageKey = "") {
  const normalized = `${stageKey || ""}`.trim();
  const selected = `${selectedStageKey || ""}`.trim();
  const activeIndex = statusStageIndex(normalized);
  host.querySelectorAll(".status-stage-step").forEach((step) => {
    const stepKey = step.dataset.stageKey || "";
    const stepIndex = statusStageIndex(stepKey);
    const isDone = activeIndex >= 0 && stepIndex >= 0 && stepIndex < activeIndex;
    const isActive = activeIndex >= 0 && stepIndex === activeIndex;
    const isSelected = selected && stepKey === selected;
    const selectable = isSelectableStatusStage(stepKey, normalized);
    step.disabled = !selectable;
    step.setAttribute("aria-selected", isSelected ? "true" : "false");
    step.classList.toggle("is-done", isDone);
    step.classList.toggle("is-active", isActive);
    step.classList.toggle("is-selected", Boolean(isSelected));
    step.classList.toggle("is-disabled", !selectable);
  });
}

export function resolveSelectedStage({
  currentStageKey = "",
  selectedStageKey = "",
  manualStageSelection = false,
} = {}) {
  return resolveSelectedStatusStage({
    currentStageKey,
    selectedStageKey,
    manualStageSelection,
  });
}

export const STAGE_FLOW = STATUS_STAGE_FLOW;
