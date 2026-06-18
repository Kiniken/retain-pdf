import {
  DOWNLOAD_ANIMATION_PATH,
  OCR_ANIMATION_PATH,
  RENDER_ANIMATION_PATH,
  STAGE_ANIMATIONS,
  TRANSLATION_ANIMATION_PATH,
  UPLOAD_ANIMATION_PATH,
} from "./job-status-card-presets.js";
import {
  resolveVisualStageKeyForSnapshot,
} from "./job-status-card-visuals.js";
import { createStatusStageAnimationController } from "./job-status-card-animation.js";
import {
  setCancelEnabled,
  setElapsed,
  setProgress,
  syncPrimaryActions,
} from "./job-status-card-rendering.js";
import {
  syncStageFlow,
} from "./job-status-card-stage-flow.js";
import {
  createStatusCardStageSelectionController,
} from "./job-status-card-selection.js";
import {
  createStatusCardProgressAnimation,
} from "./job-status-card-progress-animation.js";
import {
  bindStageRetryEvents,
  renderStageRetryAction,
} from "./job-status-card-retry.js";
import { normalizeStatusCardSnapshot } from "./job-status-card-snapshot.js";
import { statusStageLabel } from "../../job-status/stage-flow-model.js";
import {
  STATUS_CARD_IDS,
  STATUS_CARD_SELECTORS,
  statusCardElementById,
} from "./job-status-card-dom-contract.js";
import { syncStageSubstageStates } from "./job-status-card-substages.js";
import { jobStatusCardTemplate } from "./job-status-card-template.js";

class JobStatusCard extends HTMLElement {
  #stageAnimationController = null;
  #stageSelection = createStatusCardStageSelectionController();
  #progressAnimation = createStatusCardProgressAnimation({
    renderProgress: (options) => this.setProgress(options),
  });
  #lastSnapshot = null;

  connectedCallback() {
    if (this.dataset.hydrated === "1") {
      return;
    }
    this.dataset.hydrated = "1";
    this.id = this.id || "job-status-card";
    this.classList.add("card", "status-card", "hidden");
    this.#stageAnimationController = createStatusStageAnimationController(this);
    this.innerHTML = jobStatusCardTemplate({
      translationAnimationPath: TRANSLATION_ANIMATION_PATH,
      ocrAnimationPath: OCR_ANIMATION_PATH,
      uploadAnimationPath: UPLOAD_ANIMATION_PATH,
      downloadAnimationPath: DOWNLOAD_ANIMATION_PATH,
      renderAnimationPath: RENDER_ANIMATION_PATH,
    });
    statusCardElementById(this, STATUS_CARD_IDS.stageFlow)?.addEventListener("click", (event) => {
      const button = event.target?.closest?.(".status-stage-step");
      const stageKey = button?.dataset?.stageKey || "";
      if (!stageKey || button.disabled) {
        return;
      }
      this.#stageSelection.selectStage(stageKey);
      this.#renderSelectedStage();
    });
    bindStageRetryEvents(this);
  }

  disconnectedCallback() {
    this.#progressAnimation.clear();
  }

  setStagePresentation({ label = "等待中", value = "准备中", stageKey = "" } = {}) {
    const labelEl = statusCardElementById(this, STATUS_CARD_IDS.ringLabel);
    const valueEl = statusCardElementById(this, STATUS_CARD_IDS.ringValue);
    const detailEl = statusCardElementById(this, STATUS_CARD_IDS.stageDetail);
    const selection = this.#stageSelection.syncCurrentStage(stageKey);
    this.setStageFlow(selection.currentStageKey, selection.selectedStageKey);
    const selectedIsCurrent = this.#stageSelection.selectedIsCurrent();
    const visualStageKey = selectedIsCurrent ? resolveVisualStageKeyForSnapshot(this.#lastSnapshot, selection.currentStageKey) : selection.selectedStageKey;
    this.#stageAnimationController?.setStageVisualMode(visualStageKey);
    if (labelEl) {
      labelEl.textContent = selectedIsCurrent
        ? statusStageLabel(selection.currentStageKey, label)
        : statusStageLabel(selection.selectedStageKey, "阶段");
    }
    if (valueEl) {
      valueEl.textContent = value;
    }
    if (detailEl) {
      detailEl.textContent = "";
      detailEl.classList.add("hidden");
    }
  }

  setStageFlow(stageKey = "", selectedStageKey = "") {
    syncStageFlow(this, stageKey, selectedStageKey);
  }

  syncPrimaryActions(options = {}) {
    syncPrimaryActions(this, options);
  }

  #syncStageSubstages(selectedStageKey, selectedIsCurrent, selectedProgress = null) {
    syncStageSubstageStates(
      this.querySelector(STATUS_CARD_SELECTORS.substageFlow),
      selectedStageKey,
      selectedIsCurrent,
      this.#lastSnapshot,
      selectedProgress,
    );
  }

  setElapsed(value = "-") {
    setElapsed(this, value);
  }

  setProgress(options = {}) {
    setProgress(this, options);
  }

  setCancelEnabled(enabled) {
    setCancelEnabled(this, enabled);
  }

  renderSnapshot(snapshotPayload = {}) {
    const snapshot = normalizeStatusCardSnapshot(snapshotPayload);
    const previousJobId = this.#stageSelection.snapshot().currentJobId;
    const selection = this.#stageSelection.syncSnapshot({
      jobId: snapshot.jobId,
      stageKey: snapshot.stageKey,
    });
    if (selection.currentJobId && selection.currentJobId !== previousJobId) {
      this.#progressAnimation.reset();
    }
    this.#lastSnapshot = snapshot;
    this.dataset.status = `${snapshot.status || ""}`.trim();
    this.setStagePresentation({
      label: snapshot.label,
      value: snapshot.value,
      stageKey: snapshot.stageKey,
    });
    this.setElapsed(snapshot.elapsed);
    this.#renderSelectedStage();
    this.setCancelEnabled(snapshot.cancelEnabled);
  }

  #renderSelectedStage() {
    const snapshot = this.#lastSnapshot;
    if (!snapshot) {
      return;
    }
    const display = this.#stageSelection.buildDisplay(snapshot);
    this.setStageFlow(snapshot.stageKey, display.selected);
    this.#stageAnimationController?.setStageVisualMode(
      display.visualStageKey || resolveVisualStageKeyForSnapshot(snapshot, display.selected),
    );
    const errorSummaryEl = statusCardElementById(this, STATUS_CARD_IDS.stageErrorSummary);
    const detailEl = statusCardElementById(this, STATUS_CARD_IDS.stageDetail);
    const bodyEl = this.querySelector(STATUS_CARD_SELECTORS.body);
    this.#syncStageSubstages(display.selected, display.selectedIsCurrent, display.selectedProgress);
    this.#stageAnimationController?.syncProgressSpeed({
      stageKey: display.selected,
      current: display.selectedProgress?.current,
      total: display.selectedProgress?.total,
      progressUnit: display.selectedProgress?.progressUnit,
    });
    if (errorSummaryEl) {
      errorSummaryEl.textContent = display.errorState.errorText;
      errorSummaryEl.classList.toggle("hidden", !display.errorState.showError);
    }
    bodyEl?.classList.toggle("has-error", display.errorState.bodyHasError);
    this.#progressAnimation.render({
      selected: display.selected,
      selectedIsCurrent: display.selectedIsCurrent,
      snapshot,
      selectedProgress: display.selectedProgress,
    });
    if (detailEl) {
      detailEl.textContent = display.detailText;
      detailEl.classList.toggle("hidden", !display.showDetail);
    }
    this.syncPrimaryActions(display.primaryActions);
    renderStageRetryAction(this, display.selected, display.retryAction);
  }

}

if (!customElements.get("job-status-card")) {
  customElements.define("job-status-card", JobStatusCard);
}
