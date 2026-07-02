import { STATUS_CARD_IDS } from "./job-status-card-dom-contract.js";

export function jobStatusCardTemplate({
  translationAnimationPath,
  ocrAnimationPath,
  uploadAnimationPath,
  downloadAnimationPath,
  renderAnimationPath,
} = {}) {
  return `
    <div class="status-card-shell">
      <div class="status-card-body">
        <div class="status-head">
          <button id="${STATUS_CARD_IDS.cancelButton}" type="button" class="status-action-btn status-head-btn status-head-cancel" aria-label="取消任务" title="取消任务" disabled>
            <span>取消</span>
          </button>
          <div class="status-head-center">
            <div id="${STATUS_CARD_IDS.ringLabel}" class="status-ring-label">等待中</div>
            <div id="${STATUS_CARD_IDS.ringElapsed}" class="status-ring-elapsed">0秒</div>
          </div>
          <button id="${STATUS_CARD_IDS.detailButton}" type="button" class="status-action-btn status-head-btn status-head-detail" aria-label="任务详情" title="任务详情">
            <span>详情</span>
          </button>
        </div>

        <div id="${STATUS_CARD_IDS.stageFlow}" class="status-stage-flow" role="tablist" aria-label="任务流程">
          <button type="button" class="status-stage-step" data-stage-key="ocr" role="tab">
            <span class="status-stage-step-name">OCR</span>
          </button>
          <button type="button" class="status-stage-step" data-stage-key="translate" role="tab">
            <span class="status-stage-step-name">翻译</span>
          </button>
          <button type="button" class="status-stage-step" data-stage-key="render" role="tab">
            <span class="status-stage-step-name">渲染</span>
          </button>
          <button type="button" class="status-stage-step" data-stage-key="done" role="tab">
            <span class="status-stage-step-name">完成</span>
          </button>
        </div>

        <div id="${STATUS_CARD_IDS.stageErrorSummary}" class="status-stage-error-summary hidden"></div>
        <section class="status-progress-hero">
          <div class="status-animation-wrap">
            <div id="status-stage-animation" class="status-stage-animation hidden" aria-label="任务阶段动画">
              <div id="status-stage-lottie" class="status-stage-lottie"></div>
            </div>
          </div>
          <div class="status-progress-content">
            <div class="status-progress-copy">
              <div id="${STATUS_CARD_IDS.ringValue}" class="status-ring-value">准备中</div>
              <div id="${STATUS_CARD_IDS.stageDetail}" class="status-stage-detail">-</div>
            </div>
            <div class="status-substage-flow hidden" aria-label="任务子阶段"></div>
            <div class="status-progress-block">
              <div id="${STATUS_CARD_IDS.progressBar}" class="status-progress-bar" role="progressbar" aria-label="任务进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-value="0">
                <div class="status-progress-bar-fill"></div>
              </div>
              <div class="progress-track hidden"><div id="${STATUS_CARD_IDS.legacyProgressBar}" class="progress-bar"></div></div>
              <div class="status-progress-foot">
                <span id="${STATUS_CARD_IDS.progressText}" class="status-progress-text">-</span>
                <span id="${STATUS_CARD_IDS.progressPercent}" class="status-progress-percent">0%</span>
              </div>
            </div>
          </div>
          <div class="status-progress-ring-wrap" aria-label="任务进度百分比">
            <div id="${STATUS_CARD_IDS.progressRing}" class="status-progress-ring" role="progressbar" aria-label="任务进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-value="0">
              <span class="status-progress-ring-text">0%</span>
            </div>
            <div id="${STATUS_CARD_IDS.progressRingMeta}" class="status-animation-meta">-</div>
          </div>
          <div id="${STATUS_CARD_IDS.stageRetry}" class="status-stage-retry is-empty" aria-hidden="true"></div>
        </section>

        <div class="status-card-footer">
          <div class="status-result-actions hidden">
            <a id="${STATUS_CARD_IDS.markdownBundleButton}" class="status-action-btn task-toolbar-btn-result hidden disabled" href="#" target="_blank" rel="noopener noreferrer" aria-label="下载 Markdown" title="下载 Markdown" aria-disabled="true">
              <span>下载 Markdown</span>
            </a>
            <a id="${STATUS_CARD_IDS.sourcePdfButton}" class="status-action-btn task-toolbar-btn-result hidden disabled" href="#" target="_blank" rel="noopener noreferrer" aria-label="下载原始 PDF" title="下载原始 PDF" aria-disabled="true">
              <span>原始 PDF</span>
            </a>
            <a id="${STATUS_CARD_IDS.readerButton}" class="status-action-btn task-toolbar-btn-result hidden disabled" href="#" aria-label="对照阅读" title="对照阅读" aria-disabled="true">
              <span>对照阅读</span>
            </a>
            <a id="${STATUS_CARD_IDS.pdfButton}" class="status-action-btn task-toolbar-btn-result hidden disabled" href="#" target="_blank" rel="noopener noreferrer" aria-label="下载 PDF" title="下载 PDF" aria-disabled="true">
              <span>下载 PDF</span>
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="hidden">
      <div id="job-id">-</div>
      <div id="job-status">idle</div>
      <div id="job-stage-detail">-</div>
      <div id="query-job-duration">-</div>
      <div id="job-finished-at">-</div>
      <span id="status-translation-animation-src">${translationAnimationPath || ""}</span>
      <span id="status-ocr-animation-src">${ocrAnimationPath || ""}</span>
      <span id="status-upload-animation-src">${uploadAnimationPath || ""}</span>
      <span id="status-download-animation-src">${downloadAnimationPath || ""}</span>
      <span id="status-render-animation-src">${renderAnimationPath || ""}</span>
      <a id="${STATUS_CARD_IDS.legacyBundleButton}" class="button-link disabled" href="#" target="_blank" rel="noopener noreferrer">ZIP</a>
      <a id="${STATUS_CARD_IDS.legacyMarkdownRawButton}" class="button-link secondary disabled" href="#" target="_blank" rel="noopener noreferrer">Markdown</a>
      <a id="${STATUS_CARD_IDS.legacyMarkdownJsonButton}" class="button-link secondary disabled" href="#" target="_blank" rel="noopener noreferrer">JSON</a>
    </div>
  `;
}
