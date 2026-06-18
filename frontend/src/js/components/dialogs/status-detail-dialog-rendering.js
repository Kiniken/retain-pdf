import {
  idSelector,
  STATUS_DETAIL_DIALOG,
} from "./status-detail-dialog-dom-contract.js";

export function setHeadline(host, { iconMarkup = "", jobId = "-", note = "查看任务概览、失败原因与事件流" } = {}) {
  const { headline } = STATUS_DETAIL_DIALOG.ids;
  const icon = host.querySelector(idSelector(headline.icon));
  const jobIdEl = host.querySelector(idSelector(headline.jobId));
  const noteEl = host.querySelector(idSelector(headline.note));
  if (icon) {
    icon.innerHTML = iconMarkup;
  }
  if (jobIdEl) {
    jobIdEl.textContent = jobId;
  }
  if (noteEl) {
    noteEl.textContent = note;
  }
}

export function renderStageHistory(host, { markup = "", emptyText = "暂无阶段记录", hasItems = false } = {}) {
  const { stageHistory } = STATUS_DETAIL_DIALOG.ids;
  const list = host.querySelector(idSelector(stageHistory.list));
  const empty = host.querySelector(idSelector(stageHistory.empty));
  if (!list || !empty) {
    return;
  }
  if (!hasItems) {
    list.innerHTML = "";
    list.classList.add("hidden");
    empty.textContent = emptyText;
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  list.classList.remove("hidden");
  list.innerHTML = markup;
}

export function renderEvents(host, { markup = "", count = 0, emptyText = "暂无事件", hasItems = false } = {}) {
  const { events } = STATUS_DETAIL_DIALOG.ids;
  const list = host.querySelector(idSelector(events.list));
  const empty = host.querySelector(idSelector(events.empty));
  const status = host.querySelector(idSelector(events.status));
  if (!list || !empty || !status) {
    return;
  }
  status.textContent = hasItems ? `最近 ${count} 条` : "暂无事件";
  if (!hasItems) {
    list.innerHTML = "";
    list.classList.add("hidden");
    empty.textContent = emptyText;
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  list.classList.remove("hidden");
  list.innerHTML = markup;
}

export function setRuntimeDetails(host, details = {}) {
  const { runtime } = STATUS_DETAIL_DIALOG.ids;
  const entries = [
    [runtime.currentStage, details.currentStage],
    [runtime.stageElapsed, details.stageElapsed],
    [runtime.totalElapsed, details.totalElapsed],
    [runtime.retryCount, details.retryCount],
    [runtime.lastTransition, details.lastTransition],
    [runtime.terminalReason, details.terminalReason],
    [runtime.inputProtocol, details.inputProtocol],
    [runtime.stageSpecVersion, details.stageSpecVersion],
    [runtime.mathMode, details.mathMode],
  ];
  entries.forEach(([id, value]) => {
    const el = host.querySelector(idSelector(id));
    if (el) {
      el.textContent = value ?? "-";
    }
  });
}

export function setFailureDetails(host, details = {}) {
  const { failure } = STATUS_DETAIL_DIALOG.ids;
  const entries = [
    [failure.summary, details.summary],
    [failure.category, details.category],
    [failure.stage, details.stage],
    [failure.rootCause, details.rootCause],
    [failure.suggestion, details.suggestion],
    [failure.lastLogLine, details.lastLogLine],
    [failure.retryable, details.retryable],
  ];
  entries.forEach(([id, value]) => {
    const el = host.querySelector(idSelector(id));
    if (el) {
      el.textContent = value ?? "-";
    }
  });
}

export function setRerunAction(host, { enabled = false, status = "" } = {}) {
  const { failure } = STATUS_DETAIL_DIALOG.ids;
  const button = host.querySelector(idSelector(failure.rerunButton));
  const statusEl = host.querySelector(idSelector(failure.rerunStatus));
  if (button) {
    button.disabled = !enabled;
  }
  if (statusEl && status) {
    statusEl.textContent = status;
  }
}
