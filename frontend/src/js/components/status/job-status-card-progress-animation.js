import {
  buildProgressOptions,
  shouldAnimateRenderPageProgress,
} from "../../job-status/status-card-progress-view-model.js";

export function createStatusCardProgressAnimation({
  renderProgress,
  buildProgressRenderOptions = buildProgressOptions,
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = (timer) => clearTimeout(timer),
  tickDelay = 120,
} = {}) {
  const displayedProgressByStage = {};
  let timer = null;

  function clear() {
    if (timer) {
      clearTimer(timer);
      timer = null;
    }
  }

  function reset() {
    clear();
    Object.keys(displayedProgressByStage).forEach((stageKey) => {
      delete displayedProgressByStage[stageKey];
    });
  }

  function rememberProgress(selected, current, total) {
    displayedProgressByStage[selected] = {
      current: Number.isFinite(current) ? current : null,
      total: Number.isFinite(total) ? total : null,
    };
  }

  function render({
    selected,
    selectedIsCurrent,
    snapshot,
    selectedProgress,
  } = {}) {
    const previous = displayedProgressByStage[selected];
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
      clear();
      rememberProgress(selected, targetCurrent, targetTotal);
      renderProgress?.(buildProgressRenderOptions({
        selected,
        selectedIsCurrent,
        snapshot,
        selectedProgress,
      }));
      return {
        animated: false,
        current: targetCurrent,
        total: targetTotal,
      };
    }

    clear();
    let displayedCurrent = previousCurrent;
    const tick = () => {
      displayedCurrent = Math.min(targetCurrent, displayedCurrent + 1);
      rememberProgress(selected, displayedCurrent, targetTotal);
      renderProgress?.(buildProgressRenderOptions({
        selected,
        selectedIsCurrent,
        snapshot,
        selectedProgress,
        displayedCurrent,
      }));
      if (displayedCurrent < targetCurrent) {
        timer = setTimer(tick, tickDelay);
      }
    };
    tick();
    return {
      animated: true,
      current: displayedCurrent,
      total: targetTotal,
    };
  }

  function snapshot() {
    return {
      hasTimer: Boolean(timer),
      displayedProgressByStage: { ...displayedProgressByStage },
    };
  }

  return {
    clear,
    render,
    reset,
    snapshot,
  };
}
