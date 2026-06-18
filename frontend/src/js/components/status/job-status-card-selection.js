import {
  resolveSelectedStatusStage,
} from "../../job-status/stage-flow-model.js";
import {
  buildSelectedStageDisplay,
} from "../../job-status/selected-stage-display-view-model.js";

export {
  effectiveFlowStageKey,
  resolveSelectedStageContext,
} from "../../job-status/selected-stage-view-model.js";

function normalizeStageKey(stageKey = "") {
  return `${stageKey || ""}`.trim();
}

function normalizeJobId(jobId = "") {
  return `${jobId || ""}`.trim();
}

export function createStatusCardSelectionState() {
  const state = {
    currentStageKey: "",
    currentJobId: "",
    selectedStageKey: "",
    manualStageSelection: false,
  };

  function resolveSelection() {
    const selection = resolveSelectedStatusStage({
      currentStageKey: state.currentStageKey,
      selectedStageKey: state.selectedStageKey,
      manualStageSelection: state.manualStageSelection,
    });
    state.selectedStageKey = selection.selectedStageKey;
    state.manualStageSelection = selection.manualStageSelection;
    return snapshot();
  }

  function resetSelection() {
    state.selectedStageKey = "";
    state.manualStageSelection = false;
  }

  function syncSnapshot({ jobId = "", stageKey = "" } = {}) {
    const normalizedJobId = normalizeJobId(jobId);
    const normalizedStageKey = normalizeStageKey(stageKey);
    const jobChanged = Boolean(normalizedJobId && normalizedJobId !== state.currentJobId);
    if (jobChanged) {
      state.currentJobId = normalizedJobId;
      resetSelection();
    }
    return syncCurrentStage(normalizedStageKey);
  }

  function syncCurrentStage(stageKey = "") {
    const normalizedStageKey = normalizeStageKey(stageKey);
    const previousStageKey = state.currentStageKey;
    state.currentStageKey = normalizedStageKey;
    if (previousStageKey && previousStageKey !== normalizedStageKey) {
      state.manualStageSelection = false;
    }
    return resolveSelection();
  }

  function selectStage(stageKey = "") {
    state.selectedStageKey = normalizeStageKey(stageKey);
    state.manualStageSelection = true;
    return resolveSelection();
  }

  function snapshot() {
    return {
      currentJobId: state.currentJobId,
      currentStageKey: state.currentStageKey,
      selectedStageKey: state.selectedStageKey,
      manualStageSelection: state.manualStageSelection,
    };
  }

  return {
    resetSelection,
    selectStage,
    snapshot,
    syncCurrentStage,
    syncSnapshot,
  };
}

export function createStatusCardStageSelectionController({
  selectionState = createStatusCardSelectionState(),
} = {}) {
  function snapshot() {
    return selectionState.snapshot();
  }

  function syncSnapshot({ jobId = "", stageKey = "" } = {}) {
    return selectionState.syncSnapshot({ jobId, stageKey });
  }

  function syncCurrentStage(stageKey = "") {
    return selectionState.syncCurrentStage(stageKey);
  }

  function selectStage(stageKey = "") {
    return selectionState.selectStage(stageKey);
  }

  function selectedIsCurrent() {
    const current = snapshot();
    return !current.selectedStageKey || current.selectedStageKey === current.currentStageKey;
  }

  function buildDisplay(snapshotPayload = null) {
    return buildSelectedStageDisplay({
      snapshot: snapshotPayload,
      selectedStageKey: snapshot().selectedStageKey,
    });
  }

  return {
    buildDisplay,
    selectStage,
    selectedIsCurrent,
    snapshot,
    syncCurrentStage,
    syncSnapshot,
  };
}
