// 进度区块(蓝图 §2 features/status/;镜像
// job-status-card-progress-renderer.js 的 renderProgressComponents/
// renderProgressModel——DOM 契约逐 id/class/CSS 变量保留(蓝图风险 §8.7:
// --status-ring-percent、--status-progress-percent、data-value、
// aria-valuenow)。renderOptions 来自 useStagedProgressAnimation 的输出,
// 本组件只管声明式渲染,不持有动画状态。

import { buildProgressRenderModel } from "./progress-model.js";
import { STATUS_CARD_IDS } from "./status-card-dom-ids.js";

function roundPercent(percent) {
  const numeric = Number(percent);
  return Math.round(Math.max(0, Math.min(100, Number.isFinite(numeric) ? numeric : 0)));
}

export function ProgressBlock({ renderOptions }) {
  const model = buildProgressRenderModel(renderOptions || {});
  const {
    visible,
    percent = 0,
    text = "",
    componentText = "-",
    indeterminate = false,
    legacyIndeterminate = false,
  } = model || {};
  const rounded = roundPercent(percent);
  const ringText = indeterminate ? "..." : `${rounded}%`;
  const ringMetaText = componentText || (indeterminate ? "处理中" : `${rounded}%`);
  const footPercentText = indeterminate ? "处理中" : `${rounded}%`;

  return (
    <>
      <div className={`status-progress-block${visible ? "" : " hidden"}`}>
        <div
          id={STATUS_CARD_IDS.progressBar}
          className={`status-progress-bar${indeterminate ? " is-indeterminate" : ""}`}
          role="progressbar"
          aria-label="任务进度"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={visible ? percent : 0}
          data-value={visible ? percent : 0}
          style={{ "--status-progress-percent": `${visible ? percent : 0}%` }}
        >
          <div className="status-progress-bar-fill" />
        </div>
        <div className="progress-track hidden">
          <div
            id={STATUS_CARD_IDS.legacyProgressBar}
            className={`progress-bar${visible && legacyIndeterminate ? " is-indeterminate" : ""}`}
            style={{ width: visible ? `${percent}%` : "0%" }}
          />
        </div>
        <div className="status-progress-foot">
          <span id={STATUS_CARD_IDS.progressText} className="status-progress-text">{visible ? text : ""}</span>
          <span id={STATUS_CARD_IDS.progressPercent} className="status-progress-percent">{footPercentText}</span>
        </div>
      </div>
      <div className="status-progress-ring-wrap" aria-label="任务进度百分比">
        <div
          id={STATUS_CARD_IDS.progressRing}
          className={`status-progress-ring${indeterminate ? " is-indeterminate" : ""}`}
          role="progressbar"
          aria-label="任务进度"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={percent}
          data-value={percent}
          style={{ "--status-ring-percent": `${indeterminate ? 42 : percent}%` }}
        >
          <span className="status-progress-ring-text">{ringText}</span>
        </div>
        <div id={STATUS_CARD_IDS.progressRingMeta} className="status-animation-meta">{ringMetaText}</div>
      </div>
    </>
  );
}
