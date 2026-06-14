import {
  DOWNLOAD_ANIMATION_PATH,
  OCR_ANIMATION_PATH,
  RENDER_ANIMATION_PATH,
  STAGE_ANIMATIONS,
  STAGE_LABELS,
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
  resolveSelectedStage,
  syncStageFlow,
} from "./job-status-card-stage-flow.js";
import {
  buildProgressOptions,
  shouldAnimateRenderPageProgress,
} from "./job-status-card-progress.js";
import {
  bindStageRetryEvents,
  renderStageRetryAction,
} from "./job-status-card-retry.js";
import { normalizeStatusCardSnapshot } from "./job-status-card-snapshot.js";
import {
  effectiveFlowStageKey,
  resolveSelectedStageContext,
} from "./job-status-card-selection.js";
import { syncStageSubstageStates } from "./job-status-card-substages.js";
import { jobStatusCardTemplate } from "./job-status-card-template.js";

function shortStageLabel(stageKey = "", fallback = "等待中") {
  const normalized = `${stageKey || ""}`.trim();
  if (STAGE_LABELS[normalized]) {
    return STAGE_LABELS[normalized];
  }
  if (normalized === "failed") {
    return "失败";
  }
  if (normalized === "canceled") {
    return "已取消";
  }
  return fallback;
}

class JobStatusCard extends HTMLElement {
  #stageAnimationController = null;
  #currentStageKey = "";
  #selectedStageKey = "";
  #manualStageSelection = false;
  #lastSnapshot = null;
  #currentJobId = "";
  #progressAnimationTimer = null;
  #displayedProgressByStage = {};

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
    this.querySelector("#status-stage-flow")?.addEventListener("click", (event) => {
      const button = event.target?.closest?.(".status-stage-step");
      const stageKey = button?.dataset?.stageKey || "";
      if (!stageKey || button.disabled) {
        return;
      }
      this.#manualStageSelection = true;
      this.#selectedStageKey = stageKey;
      this.#renderSelectedStage();
    });
    bindStageRetryEvents(this);
  }

  disconnectedCallback() {
    this.#clearProgressAnimation();
  }

  setStagePresentation({ label = "等待中", value = "准备中", stageKey = "" } = {}) {
    const labelEl = this.querySelector("#status-ring-label");
    const valueEl = this.querySelector("#status-ring-value");
    const detailEl = this.querySelector("#status-stage-detail");
    const previousCurrentStageKey = this.#currentStageKey;
    this.#currentStageKey = `${stageKey || ""}`.trim();
    if (previousCurrentStageKey && previousCurrentStageKey !== this.#currentStageKey) {
      this.#manualStageSelection = false;
    }
    const selection = resolveSelectedStage({
      currentStageKey: this.#currentStageKey,
      selectedStageKey: this.#selectedStageKey,
      manualStageSelection: this.#manualStageSelection,
    });
    this.#selectedStageKey = selection.selectedStageKey;
    this.#manualStageSelection = selection.manualStageSelection;
    this.setStageFlow(this.#currentStageKey, this.#selectedStageKey);
    const selectedIsCurrent = !this.#selectedStageKey || this.#selectedStageKey === this.#currentStageKey;
    const visualStageKey = selectedIsCurrent ? resolveVisualStageKeyForSnapshot(this.#lastSnapshot, this.#currentStageKey) : this.#selectedStageKey;
    this.#stageAnimationController?.setStageVisualMode(visualStageKey);
    if (labelEl) {
      labelEl.textContent = selectedIsCurrent
        ? shortStageLabel(this.#currentStageKey, label)
        : shortStageLabel(this.#selectedStageKey, "阶段");
    }
    if (valueEl) {
      valueEl.textContent = value;
    }
    if (detailEl) {
      detailEl.textContent = value;
    }
  }

  #effectiveFlowStageKey(snapshot = this.#lastSnapshot) {
    return effectiveFlowStageKey(snapshot);
  }

  setStageFlow(stageKey = "", selectedStageKey = "") {
    syncStageFlow(this, stageKey, selectedStageKey);
  }

  syncPrimaryActions(options = {}) {
    syncPrimaryActions(this, options);
  }

  #syncStageSubstages(selectedStageKey, selectedIsCurrent, selectedProgress = null) {
    syncStageSubstageStates(
      this.querySelector(".status-substage-flow"),
      selectedStageKey,
      selectedIsCurrent,
      this.#lastSnapshot,
      selectedProgress,
    );
  }

  #clearProgressAnimation() {
    if (this.#progressAnimationTimer) {
      clearTimeout(this.#progressAnimationTimer);
      this.#progressAnimationTimer = null;
    }
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
    if (snapshot.jobId && snapshot.jobId !== this.#currentJobId) {
      this.#currentJobId = snapshot.jobId;
      this.#clearProgressAnimation();
      this.#displayedProgressByStage = {};
      this.#manualStageSelection = false;
      this.#selectedStageKey = "";
    }
    this.#lastSnapshot = snapshot;
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
    const {
      flowStageKey,
      selected,
      selectedHistoricalProgress,
      selectedIsCurrent,
      selectedProgress,
    } = resolveSelectedStageContext({
      snapshot,
      selectedStageKey: this.#selectedStageKey,
    });
    this.setStageFlow(flowStageKey || snapshot.stageKey, selected);
    this.#stageAnimationController?.setStageVisualMode(
      selectedHistoricalProgress?.visualStageKey || resolveVisualStageKeyForSnapshot(snapshot, selected),
    );
    const errorSummaryEl = this.querySelector("#status-stage-error-summary");
    const bodyEl = this.querySelector(".status-wa-body");
    const errorText = `${snapshot.errorText || ""}`.trim();
    const selectedIsError = snapshot.stageKey === "failed" || snapshot.stageKey === "canceled";
    this.#syncStageSubstages(selected, selectedIsCurrent, selectedProgress);
    this.#stageAnimationController?.syncProgressSpeed({
      stageKey: selected,
      current: selectedProgress?.current,
      total: selectedProgress?.total,
      progressUnit: selectedProgress?.progressUnit,
    });
    if (errorSummaryEl) {
      errorSummaryEl.textContent = errorText;
      errorSummaryEl.classList.toggle("hidden", !selectedIsError || !errorText);
    }
    bodyEl?.classList.toggle("has-error", Boolean(selectedIsError && errorText));
    this.#setAnimatedProgress({
      selected,
      selectedIsCurrent,
      snapshot,
      selectedProgress,
    });
    this.syncPrimaryActions({
      pdfReady: selected === "done" && snapshot.pdfReady,
      pdfUrl: snapshot.pdfUrl,
      markdownBundleReady: selected === "done" && snapshot.markdownBundleReady,
      markdownBundleUrl: snapshot.markdownBundleUrl,
      readerReady: selected === "done" && snapshot.readerReady,
      readerUrl: snapshot.readerUrl,
      sourcePdfReady: selected === "done" && snapshot.sourcePdfReady,
      sourcePdfUrl: snapshot.sourcePdfUrl,
    });
    renderStageRetryAction(this, selected, snapshot.stageRetryActions?.[selected]);
  }

  #setAnimatedProgress({ selected, selectedIsCurrent, snapshot, selectedProgress }) {
    const previous = this.#displayedProgressByStage[selected];
    const {
      previousCurrent,
      shouldAnimate,
      targetCurrent,
      targetTotal,
    } = shouldAnimateRenderPageProgress({
      selected,
      selectedIsCurrent,
      snapshot,
      selectedProgress,
      previous,
    });
    if (!shouldAnimate) {
      this.#clearProgressAnimation();
      this.#displayedProgressByStage[selected] = {
        current: Number.isFinite(targetCurrent) ? targetCurrent : null,
        total: Number.isFinite(targetTotal) ? targetTotal : null,
      };
      this.setProgress(buildProgressOptions({
        selected,
        selectedIsCurrent,
        snapshot,
        selectedProgress,
      }));
      return;
    }

    this.#clearProgressAnimation();
    let displayedCurrent = previousCurrent;
    const tick = () => {
      displayedCurrent = Math.min(targetCurrent, displayedCurrent + 1);
      this.#displayedProgressByStage[selected] = {
        current: displayedCurrent,
        total: targetTotal,
      };
      this.setProgress(buildProgressOptions({
        selected,
        selectedIsCurrent,
        snapshot,
        selectedProgress,
        displayedCurrent,
      }));
      if (displayedCurrent < targetCurrent) {
        this.#progressAnimationTimer = setTimeout(tick, 120);
      }
    };
    tick();
  }

}

if (!customElements.get("job-status-card")) {
  customElements.define("job-status-card", JobStatusCard);
}
