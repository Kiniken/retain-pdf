import { RECENT_JOBS_CLASSES } from "./dom-contract.js";

export function setRecentJobsDialogHostOpen({
  component = null,
  dialog = null,
  openButton = null,
  open = false,
} = {}) {
  if (component?.setOpen) {
    component.setOpen(open);
  } else if (dialog) {
    if (open) {
      dialog.showModal?.();
    } else {
      dialog.close?.();
    }
  } else {
    return false;
  }
  openButton?.setAttribute?.("aria-expanded", open ? "true" : "false");
  return true;
}

export function shouldAutoLoadRecentJobs({
  scrollBody = null,
  loadMoreButton = null,
  thresholdPx = 260,
  thresholdRatio = 0.35,
} = {}) {
  if (!scrollBody || !loadMoreButton) {
    return false;
  }
  if (loadMoreButton.classList?.contains?.(RECENT_JOBS_CLASSES.hidden) || loadMoreButton.disabled) {
    return false;
  }
  const remaining = scrollBody.scrollHeight - scrollBody.scrollTop - scrollBody.clientHeight;
  return remaining < Math.max(thresholdPx, scrollBody.clientHeight * thresholdRatio);
}

export function triggerRecentJobsAutoLoad({
  scrollBody = null,
  loadMoreButton = null,
} = {}) {
  if (!shouldAutoLoadRecentJobs({ scrollBody, loadMoreButton })) {
    return false;
  }
  loadMoreButton.click?.();
  return true;
}

export function scheduleRecentJobsAutoLoadHostCheck({
  component = null,
  elements = {},
  requestAnimationFrame = globalThis.requestAnimationFrame,
  isSuspended = () => false,
} = {}) {
  if (component?.scheduleAutoLoadCheck) {
    component.scheduleAutoLoadCheck();
    return true;
  }
  if (typeof requestAnimationFrame !== "function") {
    return false;
  }
  requestAnimationFrame(() => {
    if (isSuspended?.()) {
      return;
    }
    triggerRecentJobsAutoLoad({
      scrollBody: elements?.scrollBody || null,
      loadMoreButton: elements?.loadMoreButton || null,
    });
  });
  return true;
}
