export function jobStatusCardTemplate({
  translationAnimationPath,
  ocrAnimationPath,
  uploadAnimationPath,
  downloadAnimationPath,
  renderAnimationPath,
} = {}) {
  return `
    <div class="status-wa-card">
      <div class="status-wa-body">
        <div class="status-head">
          <wa-button id="cancel-btn" type="button" class="status-head-btn status-head-cancel" appearance="outlined" variant="neutral" size="s" aria-label="取消任务" title="取消任务" disabled>
            <span>取消</span>
          </wa-button>
          <div class="status-head-center">
            <div id="status-ring-label" class="status-ring-label">等待中</div>
            <div id="status-ring-elapsed" class="status-ring-elapsed">0秒</div>
          </div>
          <wa-button id="status-detail-btn" type="button" class="status-head-btn status-head-detail" appearance="plain" variant="neutral" size="s" aria-label="任务详情" title="任务详情">
            <span>详情</span>
          </wa-button>
        </div>

        <div id="status-stage-flow" class="status-stage-flow" role="tablist" aria-label="任务流程">
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

        <div id="status-stage-error-summary" class="status-stage-error-summary hidden"></div>
        <section class="status-progress-hero">
          <div class="status-animation-wrap">
            <div id="status-stage-animation" class="status-stage-animation hidden" aria-label="任务阶段动画">
              <div id="status-stage-lottie" class="status-stage-lottie"></div>
            </div>
          </div>
          <div class="status-progress-content">
            <div class="status-progress-copy">
              <div id="status-ring-value" class="status-ring-value">准备中</div>
              <div id="status-stage-detail" class="status-stage-detail">-</div>
            </div>
            <div class="status-substage-flow hidden" aria-label="任务子阶段"></div>
            <div class="status-progress-block">
              <wa-progress-bar id="status-progress-bar" class="status-progress-bar" value="0" label="任务进度"></wa-progress-bar>
              <div class="progress-track hidden"><div id="job-progress-bar" class="progress-bar"></div></div>
              <div class="status-progress-foot">
                <span id="job-progress-text" class="status-progress-text">-</span>
                <span id="status-progress-percent" class="status-progress-percent">0%</span>
              </div>
            </div>
          </div>
          <div class="status-progress-ring-wrap" aria-label="任务进度百分比">
            <wa-progress-ring id="status-progress-ring" class="status-progress-ring" value="0" label="任务进度">0%</wa-progress-ring>
            <div id="status-progress-ring-meta" class="status-animation-meta">-</div>
          </div>
          <div id="status-stage-retry" class="status-stage-retry is-empty" aria-hidden="true"></div>
        </section>

        <div class="status-card-footer">
          <div class="status-result-actions hidden">
            <wa-button id="status-markdown-bundle-btn" class="task-toolbar-btn-result hidden" href="#" target="_blank" rel="noopener noreferrer" appearance="outlined" variant="neutral" size="s" aria-label="下载 Markdown" title="下载 Markdown">
              <span>下载 Markdown</span>
            </wa-button>
            <wa-button id="reader-btn" class="task-toolbar-btn-result hidden" href="#" appearance="outlined" variant="neutral" size="s" aria-label="对照阅读" title="对照阅读" aria-disabled="true">
              <span>对照阅读</span>
            </wa-button>
            <wa-button id="pdf-btn" class="task-toolbar-btn-result hidden" href="#" target="_blank" rel="noopener noreferrer" appearance="outlined" variant="neutral" size="s" aria-label="下载 PDF" title="下载 PDF">
              <span>下载 PDF</span>
            </wa-button>
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
      <a id="download-btn" class="button-link disabled" href="#" target="_blank" rel="noopener noreferrer">ZIP</a>
      <a id="markdown-raw-btn" class="button-link secondary disabled" href="#" target="_blank" rel="noopener noreferrer">Markdown</a>
      <a id="markdown-btn" class="button-link secondary disabled" href="#" target="_blank" rel="noopener noreferrer">JSON</a>
    </div>
  `;
}
