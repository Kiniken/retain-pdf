import { $ } from "../../dom/query.js";
import { APP_DIALOG_IDS } from "../../contracts/app-contract.js";
import { RECENT_JOBS_IDS, RECENT_JOBS_SELECTORS } from "./dom-contract.js";
import {
  resolveRecentJobsHost,
} from "./host.js";
import {
  recentJobsEventTarget,
} from "./event-target.js";
import {
  buildRecentJobsListMarkup,
  renderRecentJobCardElements,
  renderRecentJobsMarkupList,
  replaceRecentJobCardElement,
} from "./list-rendering.js";
import { bindRecentJobsListEvents } from "./list-events.js";
import { hydrateRecentJobImages } from "./image-hydration.js";
import {
  recentJobsRenderTarget,
} from "./render-target.js";
import {
  recentJobsViewStateTarget,
} from "./view-state-target.js";
import {
  scheduleRecentJobsAutoLoadHostCheck,
  setRecentJobsDialogHostOpen,
} from "./host-actions.js";
import {
  applyRecentJobsEmptyState,
  applyRecentJobsErrorState,
  applyRecentJobsListState,
  applyRecentJobsLoadMoreLoadingState,
  applyRecentJobsLoadingState,
} from "./view-state.js";
import { buildRecentJobsSummaryViewModel } from "./summary-view-model.js";

export function hasRecentJobsView() {
  return resolveRecentJobsHost().hasView;
}

export function setRecentJobsDialogOpen(open) {
  const host = resolveRecentJobsHost();
  setRecentJobsDialogHostOpen({
    component: host.component,
    dialog: $(APP_DIALOG_IDS.recentJobs),
    openButton: $(RECENT_JOBS_IDS.openButton),
    open,
  });
}

export function bindRecentJobsEvents({
  onOpen,
  onLoadMore,
  onSearch,
  isSuspended = () => false,
} = {}) {
  $(RECENT_JOBS_IDS.openButton)?.addEventListener("click", () => onOpen?.());
  $(RECENT_JOBS_IDS.searchInput)?.addEventListener("input", (event) => {
    onSearch?.(event.target?.value || "");
  });
  const host = resolveRecentJobsHost();
  const target = recentJobsEventTarget({
    component: host.component,
    elements: host.elements,
    libraryMounted: host.libraryMounted,
  });
  target.scrollBody?.addEventListener("scroll", () => {
    if (isSuspended?.()) {
      return;
    }
    scheduleRecentJobsAutoLoadCheck();
  }, { passive: true });

  if (target.bindComponentEvents({ onLoadMore })) {
    return;
  }

  target.loadMoreButton?.addEventListener("click", () => onLoadMore?.());
}

export function scheduleRecentJobsAutoLoadCheck({ isSuspended = () => false } = {}) {
  const host = resolveRecentJobsHost();
  scheduleRecentJobsAutoLoadHostCheck({
    component: host.component,
    elements: host.elements,
    requestAnimationFrame: window.requestAnimationFrame?.bind(window),
    isSuspended,
  });
}

export function renderRecentJobsSummary(invocationSummary, items) {
  const { text } = buildRecentJobsSummaryViewModel(invocationSummary, items);
  const host = resolveRecentJobsHost();
  if (host.component?.renderSummary) {
    host.component.renderSummary(text);
    return;
  }
  const summaryEl = host.elements.summary;
  if (summaryEl) {
    summaryEl.textContent = text;
  }
}

export function renderRecentJobsLoading() {
  const host = resolveRecentJobsHost();
  const target = recentJobsViewStateTarget({
    component: host.component,
    elements: host.elements,
  });
  if (target.applyComponentState("renderLoading")) {
    return;
  }
  applyRecentJobsLoadingState(target);
}

export function renderRecentJobsEmpty(message, invocationSummary = null) {
  const host = resolveRecentJobsHost();
  const target = recentJobsViewStateTarget({
    component: host.component,
    elements: host.elements,
  });
  if (!target.component?.renderEmpty && !target.canApplyDomState) {
    return;
  }
  renderRecentJobsSummary(invocationSummary, []);
  if (target.applyComponentState("renderEmpty", message)) {
    return;
  }
  applyRecentJobsEmptyState(target, message);
}

export function renderRecentJobsError(message, { reset = false } = {}) {
  const host = resolveRecentJobsHost();
  const target = recentJobsViewStateTarget({
    component: host.component,
    elements: host.elements,
  });
  if (target.applyComponentState("renderError", message, { reset })) {
    return;
  }
  applyRecentJobsErrorState(target, message, { reset });
}

export function renderRecentJobsList({
  items,
  allItems,
  invocationSummary,
  reset = false,
  hasMore = false,
  onSelect,
  onDelete,
  onReader,
}) {
  const host = resolveRecentJobsHost();
  const target = recentJobsRenderTarget({
    component: host.component,
    elements: host.elements,
    libraryMounted: host.libraryMounted,
  });
  if (!target.canRenderList) {
    return;
  }
  renderRecentJobsSummary(invocationSummary, allItems);
  if (target.useComponent) {
    const markup = buildRecentJobsListMarkup(items);
    target.component.renderList(markup, {
      reset,
      hasMore,
      onSelect,
      onDelete,
      onReader,
      bindListEvents: bindRecentJobsListEvents,
      hydrateImages: hydrateRecentJobImages,
    });
    return;
  }
  if (!applyRecentJobsListState(target, { hasMore })) {
    return;
  }
  if (target.useCardElements) {
    renderRecentJobCardElements(target.list, items, { reset, onSelect, onDelete, onReader });
  } else {
    renderRecentJobsMarkupList(target.list, items, { reset, onSelect, onDelete, onReader });
  }
}

export function replaceRecentJobCard(item) {
  const jobId = `${item?.job_id || ""}`.trim();
  if (!jobId) {
    return false;
  }
  const host = resolveRecentJobsHost();
  const target = recentJobsRenderTarget({
    component: host.component,
    elements: host.elements,
    libraryMounted: host.libraryMounted,
  });
  const previous = Array.from(target.list?.querySelectorAll?.(RECENT_JOBS_SELECTORS.item) || [])
    .find((node) => `${node.dataset?.jobId || ""}`.trim() === jobId);
  if (!target.canReplaceCard || !previous) {
    return false;
  }
  return replaceRecentJobCardElement(previous, item, {
    useCardElement: target.useCardElements,
  });
}

export function setRecentJobsLoadMoreLoading() {
  const host = resolveRecentJobsHost();
  const target = recentJobsViewStateTarget({
    component: host.component,
    elements: host.elements,
  });
  if (target.applyComponentState("setLoadMoreLoading")) {
    return;
  }
  applyRecentJobsLoadMoreLoadingState(target);
}
