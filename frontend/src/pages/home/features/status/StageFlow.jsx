// 阶段流程条(蓝图 §2 features/status/;镜像 job-status-card-stage-flow.js
// 的 syncStageFlow 语义,DOM 契约逐 id/class 保留——smoke 依赖
// .status-stage-step[data-stage-key][aria-selected])。

import {
  isSelectableStatusStage,
  STATUS_STAGE_FLOW,
  STATUS_STAGE_LABELS,
  statusStageIndex,
} from "../../../../js/job-status/stage-flow-model.js";
import { STATUS_CARD_IDS } from "./status-card-dom-ids.js";

export function StageFlow({ currentStageKey = "", selectedStageKey = "", onSelectStage }) {
  const normalized = `${currentStageKey || ""}`.trim();
  const selected = `${selectedStageKey || ""}`.trim();
  const activeIndex = statusStageIndex(normalized);

  return (
    <div id={STATUS_CARD_IDS.stageFlow} className="status-stage-flow" role="tablist" aria-label="任务流程">
      {STATUS_STAGE_FLOW.map((stageKey) => {
        const stepIndex = statusStageIndex(stageKey);
        const isDone = activeIndex >= 0 && stepIndex >= 0 && stepIndex < activeIndex;
        const isActive = activeIndex >= 0 && stepIndex === activeIndex;
        const isSelected = Boolean(selected) && stageKey === selected;
        const selectable = isSelectableStatusStage(stageKey, normalized);
        const classNames = ["status-stage-step"];
        if (isDone) classNames.push("is-done");
        if (isActive) classNames.push("is-active");
        if (isSelected) classNames.push("is-selected");
        if (!selectable) classNames.push("is-disabled");
        return (
          <button
            key={stageKey}
            type="button"
            className={classNames.join(" ")}
            role="tab"
            data-stage-key={stageKey}
            disabled={!selectable}
            aria-selected={isSelected ? "true" : "false"}
            onClick={() => {
              if (selectable) {
                onSelectStage?.(stageKey);
              }
            }}
          >
            <span className="status-stage-step-name">{STATUS_STAGE_LABELS[stageKey]}</span>
          </button>
        );
      })}
    </div>
  );
}
