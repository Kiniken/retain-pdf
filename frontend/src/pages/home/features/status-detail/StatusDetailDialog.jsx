// StatusDetailDialog(蓝图 §1 主组件)——对照
// components/dialogs/status-detail-dialog-template.js 逐 id/class 镜像。
//
// 原生 <dialog> 语义(蓝图 §0.2):常驻挂载,effect 依 dialogStore 的 open
// 状态驱动 showModal()/close(),自带 backdrop-close onClick,不依赖旧
// app-shell/view.js:bindDialogBackdropClose(CredentialsDialog.jsx 先例)。
//
// 4 个 tab 全部常驻渲染,用 hidden 属性切换可见性(不卸载)——StageHistoryList/
// EventsList/TranslationDebugTab 的内部 useState(payload 展开等)在切 tab 时
// 不应该被重置。
//
// Tabs 实现(阶段 B,shadcn 改造):同 SettingsHubDialog/CredentialsDialog 的
// 选择——直接用 radix-ui 的 Tabs 原语(不经 src/components/ui/tabs.jsx 默认
// 皮肤,避免和 detail-tabs/detail-tab-panel 这套 bespoke CSS 冲突)。activeTab
// 由 useStatusDetailOverview 的 controller.activateDetailTab 驱动,Radix 走
// 受控模式。4 个面板全部转成 TabsPrimitive.Content(forceMount + 显式 hidden
// 覆盖),验证过 Radix 的 forceMount 只保证"强制渲染 children"、可见性仍由
// contentProps 里显式传入的 hidden 决定(晚于 Radix 内部计算的 hidden 展开,
// 会覆盖它)——StageHistoryList/EventsList/TranslationDebugTab 的内部 useState
// 因此继续不受 tab 切换影响,这是本文件迁移的最大风险点,已用组件测试 +
// fresh Playwright 验证(见 status-detail-dialog-component.test.mjs 与阶段 B
// 报告)。

import { useEffect, useRef } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { StageHistoryList } from "./StageHistoryList.jsx";
import { EventsList, eventsStatusText } from "./EventsList.jsx";
import { TranslationDebugTab } from "./TranslationDebugTab.jsx";
import { useStatusDetailOverview } from "./useStatusDetailOverview.js";
import { useRerunAction } from "./useRerunAction.js";
import { STATUS_DETAIL_DIALOG_IDS, STATUS_DETAIL_MARKDOWN_BUNDLE_ID } from "./status-detail-dom-ids.js";
import { useHomeServices } from "../../home-services-context.js";
import { useStoreSnapshot } from "../../../../shared/react/use-store.js";
import { useArtifactDownloadBusy } from "../../state/use-artifact-download-busy.js";
import { Button } from "../../../../components/Button.jsx";

const TABS = [
  { key: "overview", label: "概览" },
  { key: "failure", label: "失败" },
  { key: "events", label: "事件" },
  { key: "translation", label: "高级诊断", advanced: true },
];

function DetailItem({ id, label, value, optional = false }) {
  // optional 行照搬旧世界 view.js#toggleOptionalRuntimeRow 的语义:元素常驻
  // DOM,只在值为空/"-"时给容器加 hidden 类(不是整行卸载)——lastTransition/
  // terminalReason 两行是这个语义唯一的两个消费者。
  const text = `${value ?? "-"}`.trim();
  const rowHidden = optional && (!text || text === "-");
  return (
    <div className={`detail-item${rowHidden ? " hidden" : ""}`}><span className="label">{label}</span><span id={id} className="info-value">{value}</span></div>
  );
}

function OverviewMarkdownBundleLink() {
  // artifact-downloads 域(蓝图 §7)——下载状态源于 statusCardStore(与
  // ResultActions.jsx 同一份 renderJob 回调注入点的产物,status-detail 打开时
  // 展示的永远是同一个当前轮询 job,详见 composition.js「StatusDetailDialog
  // 域」装配块注释;overview 自身的 fetch 段(events/diagnostics/resumePlan)
  // 不含 markdownBundleUrl/Ready,不重复造一份派生逻辑)。点击行为走 document
  // 级委托点击(controller.js 已在 composition.js 挂载 bindEvents()),本组件
  // 不需要接 onClick,只订阅 busy store 驱动"下载中..."文案(方案二)。
  const services = useHomeServices();
  const cardSnapshot = useStoreSnapshot(services.statusCard.store);
  const busyState = useArtifactDownloadBusy(services.artifactDownloads.busyStore, STATUS_DETAIL_MARKDOWN_BUNDLE_ID);
  const ready = Boolean(cardSnapshot.snapshot?.markdownBundleReady);
  const url = cardSnapshot.snapshot?.markdownBundleUrl || "";
  const enabled = ready && Boolean(url) && !busyState.busy;
  const label = busyState.busy ? (busyState.label || "下载中...") : "下载 Markdown ZIP";
  return (
    <a
      id={STATUS_DETAIL_MARKDOWN_BUNDLE_ID}
      className={`button-link secondary${enabled ? "" : " disabled"}`}
      href={ready && url ? url : "#"}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={enabled ? "false" : "true"}
      data-url={ready && url ? url : ""}
    >
      {label}
    </a>
  );
}

function OverviewPanel({ overview, active }) {
  const ids = STATUS_DETAIL_DIALOG_IDS;
  const runtime = overview.runtime;
  return (
    <TabsPrimitive.Content
      value="overview"
      forceMount
      id={ids.panels.overview}
      className={`detail-tab-panel${active ? " is-active" : ""}`}
      data-panel="overview"
      hidden={!active}
    >
      <div className="detail-download-row">
        <OverviewMarkdownBundleLink />
      </div>
      <div className="detail-grid">
        <DetailItem id={ids.runtime.currentStage} label="当前阶段" value={runtime.currentStage} />
        <DetailItem id={ids.runtime.stageElapsed} label="当前阶段耗时" value={runtime.stageElapsed} />
        <DetailItem id={ids.runtime.totalElapsed} label="累计耗时" value={runtime.totalElapsed} />
        <DetailItem id={ids.runtime.retryCount} label="重试次数" value={runtime.retryCount} />
        <DetailItem id={ids.runtime.lastTransition} label="最近切换" value={runtime.lastTransition} optional />
        <DetailItem id={ids.runtime.terminalReason} label="终态原因" value={runtime.terminalReason} optional />
        <DetailItem id={ids.runtime.inputProtocol} label="输入协议" value={runtime.inputProtocol} />
        <DetailItem id={ids.runtime.stageSpecVersion} label="Stage Schema" value={runtime.stageSpecVersion} />
        <DetailItem id={ids.runtime.mathMode} label="公式模式" value={runtime.mathMode} />
      </div>
      <div className="status-panel detail-stage-panel">
        <div className="status-panel-head"><h3>过程时间线</h3></div>
        <StageHistoryList job={overview.job} finishedAtFallback={overview.finishedAtFallback} />
      </div>
    </TabsPrimitive.Content>
  );
}

function FailurePanel({ overview, rerunPending, controller, active }) {
  const ids = STATUS_DETAIL_DIALOG_IDS;
  const failure = overview.failure;
  const rerun = useRerunAction({ overview, rerunPending, controller });
  return (
    <TabsPrimitive.Content
      value="failure"
      forceMount
      id={ids.panels.failure}
      className={`detail-tab-panel${active ? " is-active" : ""}`}
      data-panel="failure"
      hidden={!active}
    >
      <div className="status-panel">
        <div className="status-panel-head">
          <h3>失败诊断</h3>
          <span className="status-panel-note">结构化失败摘要与排查建议</span>
        </div>
        <div className="failure-action-row">
          <button id={ids.failure.rerunButton} type="button" className="button-link secondary" disabled={rerun.disabled} onClick={rerun.run}>从断点恢复/重新运行</button>
          <span id={ids.failure.rerunStatus} className="status-panel-note">{rerun.status || "失败后如后端允许，可基于已有产物创建恢复任务。"}</span>
        </div>
        <div className="failure-hero-card">
          <span className="label">失败摘要</span>
          <span id={ids.failure.summary} className="info-value">{failure.summary}</span>
        </div>
        <div className="info-list detail-info-list">
          <div className="info-row"><span className="label">分类</span><span id={ids.failure.category} className="info-value">{failure.category}</span></div>
          <div className="info-row"><span className="label">阶段</span><span id={ids.failure.stage} className="info-value">{failure.stage}</span></div>
          <div className="info-row"><span className="label">根因</span><span id={ids.failure.rootCause} className="info-value">{failure.rootCause}</span></div>
          <div className="info-row"><span className="label">建议</span><span id={ids.failure.suggestion} className="info-value">{failure.suggestion}</span></div>
          <div className="info-row"><span className="label">最近日志</span><span id={ids.failure.lastLogLine} className="info-value">{failure.lastLogLine}</span></div>
          <div className="info-row"><span className="label">可重试</span><span id={ids.failure.retryable} className="info-value">{failure.retryable}</span></div>
        </div>
      </div>
    </TabsPrimitive.Content>
  );
}

function EventsPanel({ overview, active }) {
  const ids = STATUS_DETAIL_DIALOG_IDS;
  return (
    <TabsPrimitive.Content
      value="events"
      forceMount
      id={ids.panels.events}
      className={`detail-tab-panel${active ? " is-active" : ""}`}
      data-panel="events"
      hidden={!active}
    >
      <div className="status-panel">
        <div className="status-panel-head">
          <h3>事件流</h3>
          <span id={ids.events.status} className="status-panel-note">{eventsStatusText(overview.eventsPayload)}</span>
        </div>
        <p className="events-lead">按时间倒序展示最近事件，适合定位任务卡在哪个阶段以及最后一次失败前发生了什么。</p>
        <EventsList eventsPayload={overview.eventsPayload} />
      </div>
    </TabsPrimitive.Content>
  );
}

function TranslationPanel({ translation, controller, active }) {
  const ids = STATUS_DETAIL_DIALOG_IDS;
  return (
    <TabsPrimitive.Content
      value="translation"
      forceMount
      id={ids.panels.translation}
      className={`detail-tab-panel${active ? " is-active" : ""}`}
      data-panel="translation"
      hidden={!active}
    >
      <TranslationDebugTab translation={translation} controller={controller} />
    </TabsPrimitive.Content>
  );
}

export function StatusDetailDialog() {
  const { open, activeTab, overview, translation, rerunPending, controller, dialogStore } = useStatusDetailOverview();
  const dialogRef = useRef(null);
  const ids = STATUS_DETAIL_DIALOG_IDS;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    }
  }, [open]);

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current) {
      dialogStore.close();
    }
  }

  function handleNativeClose() {
    dialogStore.close();
  }

  const headline = overview.headline;

  return (
    <dialog
      id={ids.dialog}
      className="desktop-dialog status-detail-dialog"
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={handleNativeClose}
    >
      <form method="dialog" className="desktop-shell">
        <div className="desktop-head">
          <div className="status-detail-headline">
            <span
              id={ids.headline.icon}
              className="status-detail-head-icon"
              aria-hidden="true"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: headline.iconMarkup || "" }}
            />
            <div className="status-detail-head-copy">
              <div className="status-detail-head-top">
                <h2>任务详情</h2>
                <p className="status-detail-job-meta">Job ID <span id={ids.headline.jobId} className="status-detail-job-id mono">{headline.jobId}</span></p>
              </div>
              <p id={ids.headline.note} className="status-panel-note">{headline.note}</p>
            </div>
          </div>
          <Button id={ids.headline.closeButton} type="submit" className="dialog-close-btn" aria-label="关闭">×</Button>
        </div>
        <TabsPrimitive.Root
          className="contents"
          value={activeTab}
          onValueChange={(tab) => controller.activateDetailTab(tab)}
        >
          <div className="desktop-body status-detail-body">
            <TabsPrimitive.List className="detail-tabs" aria-label="任务详情">
              {TABS.map((tab) => (
                <TabsPrimitive.Trigger
                  key={tab.key}
                  value={tab.key}
                  id={ids.tabs[tab.key]}
                  className={`detail-tab${tab.advanced ? " detail-tab-advanced" : ""}${activeTab === tab.key ? " is-active" : ""}`}
                  data-tab={tab.key}
                >
                  {tab.label}
                </TabsPrimitive.Trigger>
              ))}
            </TabsPrimitive.List>

            <div className="detail-tab-panels">
              <OverviewPanel overview={overview} active={activeTab === "overview"} />
              <FailurePanel overview={overview} rerunPending={rerunPending} controller={controller} active={activeTab === "failure"} />
              <EventsPanel overview={overview} active={activeTab === "events"} />
              <TranslationPanel translation={translation} controller={controller} active={activeTab === "translation"} />
            </div>
          </div>
        </TabsPrimitive.Root>
      </form>
    </dialog>
  );
}
