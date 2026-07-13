// 子阶段流程条(蓝图 §2 features/status/;数据源 buildSubstageViewModel 是
// job-status/substage-view-model.js 纯 VM,原样 import——镜像
// job-status-card-substages.js 的 syncStageSubstageStates DOM 结构,
// --status-substage-count CSS 变量契约保留)。

import { buildSubstageViewModel } from "../../../../js/job-status/substage-view-model.js";

export function SubstageFlow({ selectedStageKey, selectedIsCurrent, snapshot, selectedProgress }) {
  const viewModel = buildSubstageViewModel({ selectedStageKey, selectedIsCurrent, snapshot, selectedProgress });

  return (
    <div
      className={`status-substage-flow${viewModel.hidden ? " hidden" : ""}`}
      aria-label="任务子阶段"
      style={{ "--status-substage-count": `${viewModel.cssCount}` }}
    >
      {viewModel.items.map((item) => (
        <span
          key={item.key}
          className={`status-substage-step${item.active ? " is-active" : ""}${item.done ? " is-done" : ""}`}
          data-substage-key={item.key}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
