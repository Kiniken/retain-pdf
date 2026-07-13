// 阶段时间线 / 事件流:两张触发卡片 + 两个模态框。
// 视图为 src/js/job-detail/events.js 字符串模板的 JSX 重写(类名/结构照搬);
// 事件条目视图模型复用保留的纯逻辑 status-view-model.js 与 job/ 层格式化函数。

import { formatEventTimestamp, formatRuntimeDuration } from "../../../js/job/formatters.js";
import { stageHistoryDisplay } from "../../../js/job/stage-history.js";
import { isJobTerminal } from "../../../js/job/core.js";
import { buildJobDetailEventViewModel } from "../../../js/job-detail/status-view-model.js";

// —— 以下三个私有函数照搬旧 events.js,保证耗时/载荷文案逐字节一致 ——

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

export function StageHistoryTriggerCard({ onOpen }) {
  return (
    <article className="detail-card">
      <div className="detail-modal-trigger">
        <div className="detail-trigger-head">
          <h2>阶段时间线</h2>
          <button id="detail-open-stage-history-btn" type="button" className="detail-trigger-btn" onClick={onOpen}>查看</button>
        </div>
        <p className="detail-trigger-copy">默认收起，不再把整页拉长。需要时再打开查看完整阶段切换记录。</p>
      </div>
    </article>
  );
}

export function EventsTriggerCard({ buttonText, onOpen }) {
  return (
    <article className="detail-card">
      <div className="detail-modal-trigger">
        <div className="detail-trigger-head">
          <h2>事件流</h2>
          <button id="detail-open-events-btn" type="button" className="detail-trigger-btn" onClick={onOpen}>{buttonText}</button>
        </div>
        <p className="detail-trigger-copy">默认不请求事件流。只有点击查看时才加载，避免分享页初次打开就消耗过多流量。</p>
      </div>
    </article>
  );
}

function DetailModal({ modalId, titleId, title, subtitle, closeButtonId, open, onClose, children }) {
  return (
    <section
      id={modalId}
      className={open ? "detail-modal" : "detail-modal hidden"}
      aria-hidden={open ? "false" : "true"}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="detail-modal-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="detail-modal-head">
          <div>
            <h2 id={titleId} className="detail-modal-title">{title}</h2>
            <p className="detail-modal-subtitle">{subtitle}</p>
          </div>
          <button id={closeButtonId} type="button" className="detail-modal-close" aria-label="关闭" onClick={onClose}>×</button>
        </div>
        <div className="detail-modal-body">
          {children}
        </div>
      </div>
    </section>
  );
}

function StageHistoryItem({ entry, index, job }) {
  const enterAt = entry?.enter_at ? formatEventTimestamp(entry.enter_at) : "-";
  const exitAt = entry?.exit_at ? formatEventTimestamp(entry.exit_at) : (isJobTerminal(job) ? "-" : "进行中");
  const terminalText = entry?.terminal_status ? ` · ${entry.terminal_status}` : "";
  const display = stageHistoryDisplay(entry);
  return (
    <article className="detail-stage-item">
      <div className="detail-stage-top">
        <div className="detail-stage-title">{`${index + 1}. ${display.title}`}</div>
        <div className="detail-stage-title">{formatRuntimeDuration(resolveStageHistoryDuration(entry, job))}</div>
      </div>
      <div className="detail-stage-meta">{`${enterAt} → ${exitAt}${terminalText}`}</div>
    </article>
  );
}

export function StageHistoryModal({ open, job, onClose }) {
  const history = Array.isArray(job?.stage_history) ? job.stage_history : [];
  const hasItems = history.length > 0;
  return (
    <DetailModal
      modalId="detail-stage-history-modal"
      titleId="detail-stage-history-modal-title"
      title="阶段时间线"
      subtitle="按阶段展示进入、退出与耗时。"
      closeButtonId="detail-close-stage-history-btn"
      open={open}
      onClose={onClose}
    >
      <div id="detail-stage-history-empty" className={hasItems ? "detail-empty hidden" : "detail-empty"}>暂无阶段记录</div>
      <div id="detail-stage-history-list" className={hasItems ? "detail-list" : "detail-list hidden"}>
        {history.map((entry, index) => (
          <StageHistoryItem key={index} entry={entry} index={index} job={job} />
        ))}
      </div>
    </DetailModal>
  );
}

function EventItem({ item }) {
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
  return (
    <article className="detail-event-item">
      <div className="detail-event-top">
        <div className="detail-event-title">{viewModel.event}</div>
        <div className="detail-event-title">{viewModel.level}</div>
      </div>
      <div className="detail-event-meta">{metaBits.join(" · ")}</div>
      {contextBits.length ? <div className="detail-event-meta">{contextBits.join(" · ")}</div> : null}
      <div className="detail-event-meta">{viewModel.message}</div>
      {statsBits.length ? <div className="detail-event-meta">{statsBits.join(" · ")}</div> : null}
      {payloadText ? <pre className="detail-event-payload">{payloadText}</pre> : null}
    </article>
  );
}

export function EventsModal({ open, eventsPayload, status, onClose }) {
  const items = Array.isArray(eventsPayload?.items) ? eventsPayload.items : [];
  const hasItems = items.length > 0;
  return (
    <DetailModal
      modalId="detail-events-modal"
      titleId="detail-events-modal-title"
      title="事件流"
      subtitle="只有打开时才会请求完整事件流，首次加载后会在当前页面缓存。"
      closeButtonId="detail-close-events-btn"
      open={open}
      onClose={onClose}
    >
      <div id="detail-events-status" className="detail-modal-status">{status}</div>
      <div id="detail-events-empty" className={hasItems ? "detail-empty hidden" : "detail-empty"}>暂无事件</div>
      <div id="detail-events-list" className={hasItems ? "detail-list" : "detail-list hidden"}>
        {items.map((item, index) => (
          <EventItem key={item?.seq ?? index} item={item} />
        ))}
      </div>
    </DetailModal>
  );
}
