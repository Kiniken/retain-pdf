import {
  RECENT_JOBS_PRIVATE_KEYS,
} from "./dom-contract.js";

function closeDeletePopovers(list, exceptItem = null) {
  list.querySelectorAll(".recent-job-item.is-confirming-delete").forEach((node) => {
    if (node !== exceptItem) {
      syncDeletePopover(node, false);
    }
  });
}

function syncDeletePopover(item, open = item?.classList?.contains?.("is-confirming-delete")) {
  if (!item) {
    return;
  }
  item.classList.toggle("is-confirming-delete", open);
  const deleteButton = item.querySelector?.(".recent-job-delete");
  deleteButton?.setAttribute?.("aria-expanded", open ? "true" : "false");
  const popover = item.querySelector?.(".recent-job-delete-popover");
  if (popover) {
    popover.hidden = !open;
    popover.inert = !open;
  }
}

export function bindRecentJobsListEvents(list, { onSelect, onDelete, onReader } = {}) {
  if (!list) {
    return;
  }
  list[RECENT_JOBS_PRIVATE_KEYS.select] = onSelect;
  list[RECENT_JOBS_PRIVATE_KEYS.delete] = onDelete;
  list[RECENT_JOBS_PRIVATE_KEYS.reader] = onReader;
  if (list[RECENT_JOBS_PRIVATE_KEYS.listBound]) {
    return;
  }
  list[RECENT_JOBS_PRIVATE_KEYS.listBound] = true;
  list.addEventListener("click", (event) => {
    const cancelButton = event.target?.closest?.(".recent-job-delete-cancel");
    if (cancelButton && list.contains(cancelButton)) {
      event.preventDefault();
      event.stopPropagation();
      syncDeletePopover(cancelButton.closest(".recent-job-item"), false);
      return;
    }
    const confirmButton = event.target?.closest?.(".recent-job-delete-confirm");
    if (confirmButton && list.contains(confirmButton)) {
      event.preventDefault();
      event.stopPropagation();
      const item = confirmButton.closest(".recent-job-item");
      syncDeletePopover(item, false);
      list[RECENT_JOBS_PRIVATE_KEYS.delete]?.(item?.dataset.jobId || "");
      return;
    }
    const deleteButton = event.target?.closest?.(".recent-job-delete");
    if (deleteButton && list.contains(deleteButton)) {
      event.preventDefault();
      event.stopPropagation();
      const item = deleteButton.closest(".recent-job-item");
      closeDeletePopovers(list, item);
      syncDeletePopover(item, !item?.classList?.contains?.("is-confirming-delete"));
      return;
    }
    const readerButton = event.target?.closest?.(".recent-job-reader");
    if (readerButton && list.contains(readerButton)) {
      event.preventDefault();
      event.stopPropagation();
      const item = readerButton.closest(".recent-job-item");
      syncDeletePopover(item, false);
      list[RECENT_JOBS_PRIVATE_KEYS.reader]?.(item?.dataset.jobId || "");
      return;
    }
    const button = event.target?.closest?.(".recent-job-item");
    if (!button || !list.contains(button)) {
      closeDeletePopovers(list);
      return;
    }
    event.preventDefault();
    closeDeletePopovers(list);
    list[RECENT_JOBS_PRIVATE_KEYS.select]?.(button.dataset.jobId || "");
  });
  list.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    const item = event.target?.closest?.(".recent-job-item");
    if (!item || !list.contains(item)) {
      return;
    }
    if (event.target?.closest?.("button")) {
      return;
    }
    event.preventDefault();
    syncDeletePopover(item, false);
    list[RECENT_JOBS_PRIVATE_KEYS.select]?.(item.dataset.jobId || "");
  });
}
