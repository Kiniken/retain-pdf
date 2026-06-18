import {
  READER_DIALOG_COPY,
  READER_DIALOG_ELEMENT,
  readerDialogLinkOpenState,
} from "./contract.js";
import {
  bindLegacyReaderDialogEvents,
  closeLegacyReaderDialog,
  getLegacyReaderFrameWindow,
  getLegacyReaderToolbarButtonUrl,
  hasLegacyReaderProgressTarget,
  hasLegacyLoadedReaderFrame,
  openLegacyReaderDialog,
  restoreLegacyReaderButton,
  setLegacyReaderButtonBusy,
  setLegacyReaderFrameSource,
  setLegacyReaderLoadingText,
  setLegacyReaderLoadingVisible,
  setLegacyReaderProgressWidth,
  setLegacyReaderToolbarButtonState,
} from "./legacy-dom-adapter.js";

export function getReaderDialogComponent() {
  return document.querySelector(READER_DIALOG_ELEMENT.hostSelector);
}

function easeOutCubic(value) {
  return 1 - ((1 - value) ** 3);
}

export function animateReaderProgressValue(progressState, nextValue) {
  const component = getReaderDialogComponent();
  const useComponentProgress = typeof component?.setLoadingProgress === "function";
  const target = Math.max(0, Math.min(100, Number(nextValue) || 0));
  const from = Number(progressState.value) || 0;

  if (!useComponentProgress && !hasLegacyReaderProgressTarget()) {
    progressState.value = target;
    progressState.target = target;
    return;
  }

  const applyWidth = (value) => {
    const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
    if (useComponentProgress) {
      component.setLoadingProgress({ widthPercent: safeValue });
    } else {
      setLegacyReaderProgressWidth(safeValue);
    }
  };

  if (Math.abs(from - target) < 0.1) {
    progressState.value = target;
    progressState.target = target;
    applyWidth(target);
    return;
  }

  progressState.target = target;
  if (progressState.rafId) {
    cancelAnimationFrame(progressState.rafId);
    progressState.rafId = 0;
  }

  const duration = Math.max(480, Math.min(1400, Math.abs(target - from) * 18));
  const startedAt = performance.now();

  const tick = (now) => {
    const elapsed = now - startedAt;
    const t = Math.max(0, Math.min(1, elapsed / duration));
    const value = from + ((target - from) * easeOutCubic(t));
    progressState.value = value;
    applyWidth(value);
    if (t < 1) {
      progressState.rafId = requestAnimationFrame(tick);
      return;
    }
    progressState.value = target;
    progressState.rafId = 0;
    applyWidth(target);
  };

  progressState.rafId = requestAnimationFrame(tick);
}

export function setReaderToolbarButtonState(id, enabled, url = "") {
  const component = getReaderDialogComponent();
  if (component?.setToolbarButtonState) {
    component.setToolbarButtonState(id, { enabled, url });
    return;
  }
  setLegacyReaderToolbarButtonState(id, enabled, url);
}

export function getReaderToolbarButtonUrl(id) {
  const component = getReaderDialogComponent();
  if (component?.getToolbarButtonUrl) {
    return component.getToolbarButtonUrl(id);
  }
  return getLegacyReaderToolbarButtonUrl(id);
}

export function setReaderLoadingVisible(loading) {
  const component = getReaderDialogComponent();
  if (component?.setLoadingVisible) {
    component.setLoadingVisible(loading);
    return;
  }
  setLegacyReaderLoadingVisible(loading);
}

export function setReaderLoadingProgress(progressState, percent = 0, text = READER_DIALOG_COPY.preparing) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  const component = getReaderDialogComponent();
  if (component?.setLoadingProgress) {
    component.setLoadingProgress({ text, percent: safePercent });
  } else {
    setLegacyReaderLoadingText(text);
  }
  animateReaderProgressValue(progressState, safePercent);
}

export function setReaderFrameSource(url = "about:blank") {
  const component = getReaderDialogComponent();
  if (component?.setFrameSource) {
    component.setFrameSource(url);
    return;
  }
  setLegacyReaderFrameSource(url);
}

export function openReaderDialog() {
  const component = getReaderDialogComponent();
  if (component?.open) {
    component.open();
    return;
  }
  openLegacyReaderDialog();
}

export function closeReaderDialog() {
  const component = getReaderDialogComponent();
  if (component?.close) {
    component.close();
    return;
  }
  closeLegacyReaderDialog();
}

export function getReaderFrameWindow() {
  const component = getReaderDialogComponent();
  if (component?.getFrameWindow) {
    return component.getFrameWindow();
  }
  return getLegacyReaderFrameWindow();
}

export function hasLoadedReaderFrame() {
  const component = getReaderDialogComponent();
  if (component?.hasLoadedFrame) {
    return component.hasLoadedFrame();
  }
  return hasLegacyLoadedReaderFrame();
}

export function getReaderLinkOpenState(input) {
  return readerDialogLinkOpenState(input);
}

export function setReaderButtonBusy(id, busy, label = READER_DIALOG_COPY.busyGenerating) {
  const component = getReaderDialogComponent();
  if (component?.setButtonBusy) {
    return component.setButtonBusy(id, busy, label);
  }
  return setLegacyReaderButtonBusy(id, busy, label);
}

export function restoreReaderButton(id, markup) {
  const component = getReaderDialogComponent();
  if (component?.restoreButton) {
    component.restoreButton(id, markup);
    return;
  }
  restoreLegacyReaderButton(id, markup);
}

export function bindReaderDialogEvents({
  onClose,
  onFrameLoad,
  onSourceDownload,
  onMergedDownload,
  onTranslatedDownload,
} = {}) {
  const component = getReaderDialogComponent();
  if (component?.bindEvents) {
    component.bindEvents({
      onClose,
      onFrameLoad,
      onSourceDownload,
      onMergedDownload,
      onTranslatedDownload,
    });
    return;
  }
  bindLegacyReaderDialogEvents({
    onClose,
    onFrameLoad,
    onSourceDownload,
    onMergedDownload,
    onTranslatedDownload,
  });
}
