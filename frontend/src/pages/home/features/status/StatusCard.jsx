// 状态卡根组件(蓝图 §2 features/status/;行为镜像基准
// components/status/job-status-card.js 的 renderSnapshot/#renderSelectedStage,
// DOM 契约逐 id/class 保留——smoke 依赖 #job-status-card、#status-ring-label/
// -value、#status-progress-ring、#job-progress-text、
// .status-stage-step[data-stage-key][aria-selected]、隐藏区
// #job-id/#job-status/#job-stage-detail/#query-job-duration/#job-finished-at）。
//
// 订阅设计(蓝图 §3.5):整快照订阅(statusCardStore 1 次/s 级更新,不做
// selector 拆分);elapsed 由 useElapsedTicker 独立驱动,不读本快照的任何
// "预计算好的" elapsed 字段。

import { useMemo } from "react";
import { useStoreSnapshot } from "../../../../shared/react/use-store.js";
import { useHomeServices } from "../../home-services-context.js";
import { statusStageLabel } from "../../../../js/job-status/stage-flow-model.js";
import { buildSelectedStageDisplay } from "../../../../js/job-status/selected-stage-display-view-model.js";
import { useStageSelection } from "./useStageSelection.js";
import { useElapsedTicker } from "./useElapsedTicker.js";
import { useStagedProgressAnimation } from "./useStagedProgressAnimation.js";
import { useLottieStageAnimation } from "./useLottieStageAnimation.js";
import { StageFlow } from "./StageFlow.jsx";
import { SubstageFlow } from "./SubstageFlow.jsx";
import { ProgressBlock } from "./ProgressBlock.jsx";
import { ResultActions } from "./ResultActions.jsx";
import { StageRetry } from "./StageRetry.jsx";
import { STATUS_CARD_IDS } from "./status-card-dom-ids.js";

// 拷贝自 components/status/job-status-card-visuals.js(该文件属"死,由
// StatusCard.jsx 家族替代"清单,js/components/ 禁止 import)。
function resolveVisualStageKeyForSnapshot(snapshot = null, selectedStageKey = "") {
  const stageKey = `${snapshot?.stageKey || ""}`.trim();
  const visualStageKey = `${snapshot?.visualStageKey || ""}`.trim();
  const selected = `${selectedStageKey || ""}`.trim();
  if (!selected || selected === stageKey) {
    return visualStageKey || stageKey;
  }
  return selected;
}

export function StatusCard({ visible = true }) {
  const services = useHomeServices();
  const { store, cancelCurrentJob } = services.statusCard;
  const stateSnapshot = useStoreSnapshot(store);
  const snapshot = stateSnapshot.snapshot;
  const cancelDisabled = stateSnapshot.cancelDisabled;

  const selection = useStageSelection({ jobId: snapshot.jobId, currentStageKey: snapshot.stageKey });
  // useMemo 是这里必需的(不是性能优化):buildSelectedStageDisplay 每次调用
  // 都产出新的 selectedProgress 等对象引用,若不缓存,下游 effect(staged
  // 动画/lottie 速度)的依赖数组会认为"每次渲染都变了"而无限重渲——只在
  // snapshot(store 通知才换新引用)或 selectedStageKey 真正变化时才重算。
  const display = useMemo(
    () => buildSelectedStageDisplay({ snapshot, selectedStageKey: selection.selectedStageKey }),
    [snapshot, selection.selectedStageKey],
  );

  const elapsed = useElapsedTicker(snapshot.job, { finishedAtFallback: "" });

  const visualStageKey = display.visualStageKey || resolveVisualStageKeyForSnapshot(snapshot, display.selected);
  const lottie = useLottieStageAnimation(visualStageKey, {
    stageKey: display.selected,
    current: display.selectedProgress?.current,
    total: display.selectedProgress?.total,
    progressUnit: display.selectedProgress?.progressUnit,
  });

  const renderOptions = useStagedProgressAnimation({
    selected: display.selected,
    selectedIsCurrent: display.selectedIsCurrent,
    snapshot,
    selectedProgress: display.selectedProgress,
    jobId: snapshot.jobId,
  });

  const ringLabel = display.selectedIsCurrent
    ? statusStageLabel(selection.currentStageKey, snapshot.label)
    : statusStageLabel(selection.selectedStageKey, "阶段");

  const rootClassNames = ["card", "status-card"];
  if (!visible) rootClassNames.push("hidden");
  if (lottie.hasStageAnimation) rootClassNames.push("has-stage-animation");
  if (lottie.isTranslationStage) rootClassNames.push("is-translation-stage");
  if (display.errorState.bodyHasError) rootClassNames.push("has-result-actions-error");

  // .status-card-footer 的可见性由祖先 .status-card-body.has-result-actions
  // 门控(status-card.css:508 `:not(.has-result-actions) .status-card-footer
  // { display:none }`)——镜像旧 job-status-card-rendering.js:syncPrimaryActions
  // 的 hasActions 判定(markdownBundleReady||pdfReady||readerReady||sourcePdfReady)。
  // 遗漏此类会让"对照阅读"/下载 PDF/下载 Markdown 四个按钮永远零尺寸不可点。
  const primaryActions = display.primaryActions || {};
  const hasResultActions = Boolean(
    primaryActions.markdownBundleReady
    || primaryActions.pdfReady
    || primaryActions.readerReady
    || primaryActions.sourcePdfReady,
  );
  const bodyClassNames = ["status-card-body"];
  if (display.errorState.bodyHasError) bodyClassNames.push("has-error");
  if (hasResultActions) bodyClassNames.push("has-result-actions");

  return (
    <div
      id="job-status-card"
      className={rootClassNames.join(" ")}
      data-status={`${snapshot.status || ""}`.trim()}
      data-visual-stage-key={lottie.visualStageKey}
    >
      <div className="status-card-shell">
        <div className={bodyClassNames.join(" ")}>
          <div className="status-head">
            <button
              id={STATUS_CARD_IDS.cancelButton}
              type="button"
              className="status-action-btn status-head-btn status-head-cancel"
              aria-label="取消任务"
              title="取消任务"
              disabled={!snapshot.cancelEnabled || cancelDisabled}
              onClick={() => cancelCurrentJob?.()}
            >
              <span>取消</span>
            </button>
            <div className="status-head-center">
              <div id={STATUS_CARD_IDS.ringLabel} className="status-ring-label">{ringLabel}</div>
              <div id={STATUS_CARD_IDS.ringElapsed} className="status-ring-elapsed">{elapsed.totalElapsedText}</div>
            </div>
            {/* 详情按钮:直接函数调用 openStatusDetailDialog("overview"),不是
                事件(dialogs 蓝图 §1 打开触发约定)。 */}
            <button
              id={STATUS_CARD_IDS.detailButton}
              type="button"
              className="status-action-btn status-head-btn status-head-detail"
              aria-label="任务详情"
              title="任务详情"
              onClick={() => services.statusDetail.controller.openStatusDetailDialog("overview")}
            >
              <span>详情</span>
            </button>
          </div>

          <StageFlow
            currentStageKey={snapshot.stageKey}
            selectedStageKey={display.selected}
            onSelectStage={selection.selectStage}
          />

          <div
            id={STATUS_CARD_IDS.stageErrorSummary}
            className={`status-stage-error-summary${display.errorState.showError ? "" : " hidden"}`}
          >
            {display.errorState.errorText}
          </div>

          <section className="status-progress-hero">
            <div className="status-animation-wrap">
              <div
                id="status-stage-animation"
                className={`status-stage-animation${lottie.hasStageAnimation ? "" : " hidden"}`}
                aria-label="任务阶段动画"
              >
                <div
                  id="status-stage-lottie"
                  ref={lottie.containerRef}
                  className={`status-stage-lottie${lottie.isFallback ? " is-fallback" : ""}`}
                />
              </div>
            </div>
            <div className="status-progress-content">
              <div className="status-progress-copy">
                <div id={STATUS_CARD_IDS.ringValue} className="status-ring-value">{snapshot.value}</div>
                <div
                  id={STATUS_CARD_IDS.stageDetail}
                  className={`status-stage-detail${display.showDetail ? "" : " hidden"}`}
                >
                  {display.detailText}
                </div>
              </div>
              <SubstageFlow
                selectedStageKey={display.selected}
                selectedIsCurrent={display.selectedIsCurrent}
                snapshot={snapshot}
                selectedProgress={display.selectedProgress}
              />
              <ProgressBlock renderOptions={renderOptions} />
            </div>
            <StageRetry selectedStageKey={display.selected} action={display.retryAction} />
          </section>

          <div className="status-card-footer">
            <ResultActions
              {...display.primaryActions}
              onReaderClick={() => services.reader.openReader(snapshot.jobId)}
            />
          </div>
        </div>
      </div>

      {/* 隐藏区:job-summary 文本与 parallel smoke 依赖(蓝图 §1 components/status/
          判决,原样渲染)。 */}
      <div className="hidden">
        <div id="job-id">{snapshot.summary?.fields?.jobId ?? "-"}</div>
        <div id="job-status">{snapshot.summary?.fields?.statusSummary ?? "idle"}</div>
        <div id="job-stage-detail">{snapshot.summary?.fields?.stageDetail ?? "-"}</div>
        <div id="query-job-duration">{snapshot.summary?.fields?.queryFinishedAt ?? "-"}</div>
        <div id="job-finished-at">{snapshot.summary?.fields?.finishedAt ?? "-"}</div>
      </div>
    </div>
  );
}
