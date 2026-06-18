import { $ } from "../dom/query.js";
import {
  formatEventTimestamp,
  formatRuntimeDuration,
} from "../job/formatters.js";
import {
  stageHistoryDisplay,
} from "../job/stage-history.js";
import {
  isJobTerminal,
} from "../job/core.js";
import { buildJobDetailEventViewModel } from "./status-view-model.js";
import {
  setDetailEventsStatus,
  setDetailModalOpen,
  setDetailOpenEventsButtonText,
} from "./view.js";

const JOB_EVENTS_PAGE_SIZE = 200;

function escapeHtml(value) {
  return `${value ?? ""}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function numberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseIsoTime(value) {
  const raw = `${value || ""}`.trim();
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveStageHistoryDuration(entry, job) {
  const explicit = Number(entry?.duration_ms);
  if (Number.isFinite(explicit) && explicit >= 0) {
    return explicit;
  }
  const enterAt = parseIsoTime(entry?.enter_at);
  const exitAt = parseIsoTime(entry?.exit_at);
  if (enterAt && exitAt) {
    return Math.max(0, exitAt.getTime() - enterAt.getTime());
  }
  if (enterAt && !exitAt) {
    const endAt = isJobTerminal(job)
      ? parseIsoTime(job.finished_at || job.updated_at)
      : new Date();
    if (endAt) {
      return Math.max(0, endAt.getTime() - enterAt.getTime());
    }
  }
  return NaN;
}

function formatEventPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch (_err) {
    return "";
  }
}

export function renderStageHistory(job) {
  const list = $("detail-stage-history-list");
  const empty = $("detail-stage-history-empty");
  if (!list || !empty) {
    return;
  }
  const history = Array.isArray(job.stage_history) ? job.stage_history : [];
  if (history.length === 0) {
    list.innerHTML = "";
    list.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  list.classList.remove("hidden");
  list.innerHTML = history.map((entry, index) => {
    const enterAt = entry?.enter_at ? formatEventTimestamp(entry.enter_at) : "-";
    const exitAt = entry?.exit_at ? formatEventTimestamp(entry.exit_at) : (isJobTerminal(job) ? "-" : "进行中");
    const terminalText = entry?.terminal_status ? ` · ${entry.terminal_status}` : "";
    const stageDisplay = stageHistoryDisplay(entry);
    return `
      <article class="detail-stage-item">
        <div class="detail-stage-top">
          <div class="detail-stage-title">${index + 1}. ${escapeHtml(stageDisplay.title)}</div>
          <div class="detail-stage-title">${escapeHtml(formatRuntimeDuration(resolveStageHistoryDuration(entry, job)))}</div>
        </div>
        <div class="detail-stage-meta">${escapeHtml(enterAt)} → ${escapeHtml(exitAt)}${escapeHtml(terminalText)}</div>
      </article>
    `;
  }).join("");
}

export function renderEvents(eventsPayload) {
  const list = $("detail-events-list");
  const empty = $("detail-events-empty");
  const status = $("detail-events-status");
  if (!list || !empty || !status) {
    return;
  }
  const items = Array.isArray(eventsPayload?.items) ? eventsPayload.items : [];
  status.textContent = items.length > 0 ? `全部事件 · ${items.length} 条` : "全部事件";
  if (items.length === 0) {
    list.innerHTML = "";
    list.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  list.classList.remove("hidden");
  list.innerHTML = items.map((item) => {
    const viewModel = buildJobDetailEventViewModel(item);
    const payloadText = formatEventPayload(viewModel.payload);
    const metaBits = [
      `#${viewModel.seq}`,
      formatEventTimestamp(viewModel.timestamp),
      viewModel.stageText,
    ];
    const contextBits = [
      viewModel.lane && viewModel.lane !== "main" ? `lane:${viewModel.lane}` : "",
      viewModel.displayStage ? `stage:${viewModel.displayStage}` : "",
      viewModel.substage ? `substage:${viewModel.substage}` : "",
      viewModel.provider,
      viewModel.providerStage,
      viewModel.eventType,
      viewModel.rawEventType,
    ].filter(Boolean);
    const statsBits = [];
    const progressCurrent = viewModel.progressCurrent;
    const progressTotal = viewModel.progressTotal;
    if (progressCurrent !== null || progressTotal !== null) {
      const progressUnit = viewModel.progressUnit;
      const suffix = progressUnit ? ` ${progressUnit}` : "";
      const text = viewModel.progressText ? `${viewModel.progressText} · ` : "";
      statsBits.push(`${text}progress ${progressCurrent ?? "-"} / ${progressTotal ?? "-"}${suffix}`);
    }
    const retryCount = viewModel.retryCount;
    if (retryCount !== null) {
      statsBits.push(`retry ${retryCount}`);
    }
    const elapsedMs = viewModel.elapsedMs;
    if (elapsedMs !== null) {
      statsBits.push(`elapsed ${formatRuntimeDuration(elapsedMs)}`);
    }
    return `
      <article class="detail-event-item">
        <div class="detail-event-top">
          <div class="detail-event-title">${escapeHtml(viewModel.event)}</div>
          <div class="detail-event-title">${escapeHtml(viewModel.level)}</div>
        </div>
        <div class="detail-event-meta">${escapeHtml(metaBits.join(" · "))}</div>
        ${contextBits.length ? `<div class="detail-event-meta">${escapeHtml(contextBits.join(" · "))}</div>` : ""}
        <div class="detail-event-meta">${escapeHtml(viewModel.message)}</div>
        ${statsBits.length ? `<div class="detail-event-meta">${escapeHtml(statsBits.join(" · "))}</div>` : ""}
        ${payloadText ? `<pre class="detail-event-payload">${escapeHtml(payloadText)}</pre>` : ""}
      </article>
    `;
  }).join("");
}

async function fetchAllJobEvents({ apiPrefix = "", fetchJobEvents, jobId }) {
  const items = [];
  let offset = 0;
  while (true) {
    const payload = await fetchJobEvents(jobId, apiPrefix, JOB_EVENTS_PAGE_SIZE, offset);
    const batch = Array.isArray(payload?.items) ? payload.items : [];
    items.push(...batch);
    if (batch.length < JOB_EVENTS_PAGE_SIZE) {
      return {
        ...payload,
        items,
        offset: 0,
        limit: items.length,
      };
    }
    offset += batch.length;
  }
}

async function ensureEventsLoaded({ apiPrefix = "", detailPageState, fetchJobEvents }) {
  if (detailPageState.eventsPayload) {
    setDetailEventsStatus(`全部事件 · ${Array.isArray(detailPageState.eventsPayload.items) ? detailPageState.eventsPayload.items.length : 0} 条`);
    renderEvents(detailPageState.eventsPayload);
    return detailPageState.eventsPayload;
  }
  if (!detailPageState.job?.job_id) {
    throw new Error("缺少 job_id，无法加载事件流。");
  }
  if (!detailPageState.eventsLoadingPromise) {
    setDetailEventsStatus("正在加载全部事件...");
    detailPageState.eventsLoadingPromise = fetchAllJobEvents({
      apiPrefix,
      fetchJobEvents,
      jobId: detailPageState.job.job_id,
    })
      .then((payload) => {
        detailPageState.eventsPayload = payload;
        renderEvents(payload);
        return payload;
      })
      .catch((error) => {
        setDetailEventsStatus(error.message || "读取事件流失败。");
        throw error;
      })
      .finally(() => {
        detailPageState.eventsLoadingPromise = null;
      });
  }
  return detailPageState.eventsLoadingPromise;
}

export function bindStageHistoryLauncher({ detailPageState }) {
  $("detail-open-stage-history-btn")?.addEventListener("click", () => {
    if (detailPageState.job) {
      renderStageHistory(detailPageState.job);
    }
    setDetailModalOpen("detail-stage-history-modal", true);
  });
}

export function bindEventsLauncher({ apiPrefix = "", detailPageState, fetchJobEvents }) {
  $("detail-open-events-btn")?.addEventListener("click", async () => {
    setDetailModalOpen("detail-events-modal", true);
    try {
      await ensureEventsLoaded({ apiPrefix, detailPageState, fetchJobEvents });
      setDetailOpenEventsButtonText("查看");
    } catch (_error) {
      // Status text already updated in ensureEventsLoaded.
    }
  });
}
