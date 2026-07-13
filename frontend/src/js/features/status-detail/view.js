import { $ } from "../../dom/query.js";
import {
  STATUS_DETAIL_DIALOG,
} from "../../components/dialogs/status-detail-dialog-dom-contract.js";

export function dialogComponent() {
  return document.querySelector(STATUS_DETAIL_DIALOG.hostSelector);
}

export function activateDetailTabView(name = "overview") {
  const component = dialogComponent();
  if (component?.activateTab) {
    component.activateTab(name);
    return true;
  }
  const tabs = document.querySelectorAll(STATUS_DETAIL_DIALOG.selectors.tabs);
  const panels = document.querySelectorAll(STATUS_DETAIL_DIALOG.selectors.panels);
  tabs.forEach((tab) => {
    const active = tab.dataset[STATUS_DETAIL_DIALOG.dataset.tab] === name;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  panels.forEach((panel) => {
    const active = panel.dataset[STATUS_DETAIL_DIALOG.dataset.panel] === name;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  });
  return false;
}

export function openStatusDetailDialogView(tabName = "overview") {
  const component = dialogComponent();
  if (component?.open) {
    component.open(tabName);
    return true;
  }
  activateDetailTabView(tabName);
  const dialog = $(STATUS_DETAIL_DIALOG.dialogId);
  if (dialog && !dialog.open) {
    dialog.showModal();
  }
  return false;
}

export function setRerunButtonDisabled(disabled) {
  const button = $(STATUS_DETAIL_DIALOG.ids.failure.rerunButton);
  if (button) {
    button.disabled = disabled;
  }
}

function safeSetText(id, value) {
  const el = $(id);
  if (el) {
    el.textContent = value;
  }
}

function safeSetHtml(id, value) {
  const el = $(id);
  if (el) {
    el.innerHTML = value;
  }
}

export function renderStatusDetailHeadline(headline) {
  const component = dialogComponent();
  if (component?.setHeadline) {
    component.setHeadline(headline);
    return;
  }
  safeSetHtml(STATUS_DETAIL_DIALOG.ids.headline.icon, headline.iconMarkup);
  safeSetText(STATUS_DETAIL_DIALOG.ids.headline.jobId, headline.jobId);
  safeSetText(STATUS_DETAIL_DIALOG.ids.headline.note, headline.note);
}

export function renderStatusDetailRuntime(details) {
  const component = dialogComponent();
  if (component?.setRuntimeDetails && !component?.renderSnapshot) {
    component.setRuntimeDetails(details);
    return;
  }
  const { runtime } = STATUS_DETAIL_DIALOG.ids;
  safeSetText(runtime.currentStage, details.currentStage);
  safeSetText(runtime.stageElapsed, details.stageElapsed);
  safeSetText(runtime.totalElapsed, details.totalElapsed);
  safeSetText(runtime.retryCount, details.retryCount);
  safeSetText(runtime.lastTransition, details.lastTransition);
  safeSetText(runtime.terminalReason, details.terminalReason);
  safeSetText(runtime.inputProtocol, details.inputProtocol);
  safeSetText(runtime.stageSpecVersion, details.stageSpecVersion);
  safeSetText(runtime.mathMode, details.mathMode);
  toggleOptionalRuntimeRow(runtime.lastTransition, details.lastTransition);
  toggleOptionalRuntimeRow(runtime.terminalReason, details.terminalReason);
}

function toggleOptionalRuntimeRow(id, value) {
  const text = `${value ?? "-"}`.trim();
  $(id)?.closest(".detail-item")?.classList.toggle("hidden", !text || text === "-");
}

export function renderStatusDetailFailure(details) {
  const component = dialogComponent();
  if (component?.setFailureDetails && !component?.renderSnapshot) {
    component.setFailureDetails(details);
    return;
  }
  const { failure } = STATUS_DETAIL_DIALOG.ids;
  safeSetText(failure.summary, details.summary);
  safeSetText(failure.category, details.category);
  safeSetText(failure.stage, details.stage);
  safeSetText(failure.rootCause, details.rootCause);
  safeSetText(failure.suggestion, details.suggestion);
  safeSetText(failure.lastLogLine, details.lastLogLine);
  safeSetText(failure.retryable, details.retryable);
}

export function renderStatusDetailStageHistory(stageHistory) {
  const component = dialogComponent();
  if (component?.renderStageHistory) {
    component.renderStageHistory(stageHistory);
    return;
  }
  const stageHistoryIds = STATUS_DETAIL_DIALOG.ids.stageHistory;
  const list = $(stageHistoryIds.list);
  const empty = $(stageHistoryIds.empty);
  if (!list || !empty) {
    return;
  }
  if (!stageHistory.hasItems) {
    list.innerHTML = "";
    list.classList.add("hidden");
    empty.textContent = stageHistory.emptyText;
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  list.classList.remove("hidden");
  list.innerHTML = stageHistory.markup;
}

export function renderStatusDetailEvents(events) {
  const component = dialogComponent();
  if (component?.renderEvents) {
    component.renderEvents(events);
    return;
  }
  const { events: eventIds } = STATUS_DETAIL_DIALOG.ids;
  const list = $(eventIds.list);
  const empty = $(eventIds.empty);
  const status = $(eventIds.status);
  if (!list || !empty || !status) {
    return;
  }
  if (!events.hasItems) {
    status.textContent = events.emptyText;
    list.innerHTML = "";
    list.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }
  status.textContent = `最近 ${events.count} 条`;
  empty.classList.add("hidden");
  list.classList.remove("hidden");
  list.innerHTML = events.markup;
}

export function renderStatusDetailSnapshotSections(snapshot) {
  renderStatusDetailHeadline(snapshot.headline);
  renderStatusDetailRuntime(snapshot.runtime);
  renderStatusDetailStageHistory(snapshot.stageHistory);
  renderStatusDetailFailure(snapshot.failure);
  renderStatusDetailEvents(snapshot.events);
}

export function readTranslationFilterQuery() {
  return {
    finalStatus: `${$(STATUS_DETAIL_DIALOG.ids.translation.filterFinalStatus)?.value || ""}`.trim(),
    q: `${$(STATUS_DETAIL_DIALOG.ids.translation.filterQuery)?.value || ""}`.trim(),
  };
}

export function bindStatusDetailEvents({
  commands,
}) {
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.(STATUS_DETAIL_DIALOG.selectors.openButton);
    if (!button) {
      return;
    }
    event.preventDefault();
    commands.openOverview();
  });
  document.querySelectorAll(STATUS_DETAIL_DIALOG.selectors.tabs).forEach((tab) => {
    tab.addEventListener("click", () => {
      commands.activateTab(tab.dataset[STATUS_DETAIL_DIALOG.dataset.tab] || "overview");
    });
  });
  $(STATUS_DETAIL_DIALOG.ids.translation.filterApply)?.addEventListener("click", () => {
    void commands.applyTranslationFilter();
  });
  $(STATUS_DETAIL_DIALOG.ids.translation.filterQuery)?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void commands.applyTranslationFilter();
    }
  });
  $(STATUS_DETAIL_DIALOG.ids.translation.itemsPrev)?.addEventListener("click", () => {
    void commands.changeTranslationPage("prev");
  });
  $(STATUS_DETAIL_DIALOG.ids.translation.itemsNext)?.addEventListener("click", () => {
    void commands.changeTranslationPage("next");
  });
  $(STATUS_DETAIL_DIALOG.ids.translation.itemsList)?.addEventListener("click", (event) => {
    const button = event.target?.closest?.(STATUS_DETAIL_DIALOG.selectors.translationItem);
    const itemId = `${button?.dataset?.[STATUS_DETAIL_DIALOG.dataset.translationItemId] || ""}`.trim();
    void commands.selectTranslationItem(itemId);
  });
  $(STATUS_DETAIL_DIALOG.ids.translation.itemReplay)?.addEventListener("click", () => {
    void commands.replayCurrentTranslationItem();
  });
  $(STATUS_DETAIL_DIALOG.ids.failure.rerunButton)?.addEventListener("click", () => {
    void commands.rerunCurrentJob();
  });
}
