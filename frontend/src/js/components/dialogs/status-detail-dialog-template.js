import { STATUS_DETAIL_DIALOG } from "./status-detail-dialog-dom-contract.js";
import { DOWNLOAD_ACTION_IDS } from "../../contracts/download-action-contract.js";

export function statusDetailDialogTemplate() {
  const ids = STATUS_DETAIL_DIALOG.ids;
  const data = STATUS_DETAIL_DIALOG.dataset;
  return `
    <dialog id="${STATUS_DETAIL_DIALOG.dialogId}" class="desktop-dialog status-detail-dialog">
      <form method="dialog" class="desktop-shell">
        <div class="desktop-head">
          <div class="status-detail-headline">
            <span id="${ids.headline.icon}" class="status-detail-head-icon" aria-hidden="true"></span>
            <div class="status-detail-head-copy">
              <div class="status-detail-head-top">
                <h2>任务详情</h2>
                <p class="status-detail-job-meta">Job ID <span id="${ids.headline.jobId}" class="status-detail-job-id mono">-</span></p>
              </div>
              <p id="${ids.headline.note}" class="status-panel-note">查看任务概览、失败原因与事件流</p>
            </div>
          </div>
          <button id="${ids.headline.closeButton}" type="submit" class="dialog-close-btn" aria-label="关闭">×</button>
        </div>
        <div class="desktop-body status-detail-body">
          <div class="detail-tabs" role="tablist" aria-label="任务详情">
            <button id="${ids.tabs.overview}" type="button" class="detail-tab is-active" data-${data.tab}="overview" role="tab" aria-selected="true">概览</button>
            <button id="${ids.tabs.failure}" type="button" class="detail-tab" data-${data.tab}="failure" role="tab" aria-selected="false">失败</button>
            <button id="${ids.tabs.events}" type="button" class="detail-tab" data-${data.tab}="events" role="tab" aria-selected="false">事件</button>
            <button id="${ids.tabs.translation}" type="button" class="detail-tab detail-tab-advanced" data-${data.tab}="translation" role="tab" aria-selected="false">高级诊断</button>
          </div>

          <div class="detail-tab-panels">
            <section id="${ids.panels.overview}" class="detail-tab-panel is-active" data-${data.panel}="overview" role="tabpanel">
              <div class="detail-download-row">
                <a id="${DOWNLOAD_ACTION_IDS.MARKDOWN_BUNDLE}" class="button-link secondary disabled" href="#" target="_blank" rel="noopener noreferrer">下载 Markdown ZIP</a>
              </div>
              <div class="detail-grid">
                <div class="detail-item"><span class="label">当前阶段</span><span id="${ids.runtime.currentStage}" class="info-value">-</span></div>
                <div class="detail-item"><span class="label">当前阶段耗时</span><span id="${ids.runtime.stageElapsed}" class="info-value">-</span></div>
                <div class="detail-item"><span class="label">累计耗时</span><span id="${ids.runtime.totalElapsed}" class="info-value">-</span></div>
                <div class="detail-item"><span class="label">重试次数</span><span id="${ids.runtime.retryCount}" class="info-value">0</span></div>
                <div class="detail-item"><span class="label">最近切换</span><span id="${ids.runtime.lastTransition}" class="info-value">-</span></div>
                <div class="detail-item"><span class="label">终态原因</span><span id="${ids.runtime.terminalReason}" class="info-value">-</span></div>
                <div class="detail-item"><span class="label">输入协议</span><span id="${ids.runtime.inputProtocol}" class="info-value">-</span></div>
                <div class="detail-item"><span class="label">Stage Schema</span><span id="${ids.runtime.stageSpecVersion}" class="info-value">-</span></div>
                <div class="detail-item"><span class="label">公式模式</span><span id="${ids.runtime.mathMode}" class="info-value">-</span></div>
              </div>
              <div class="status-panel detail-stage-panel">
                <div class="status-panel-head"><h3>过程时间线</h3></div>
                <div id="${ids.stageHistory.empty}" class="events-empty">暂无阶段记录</div>
                <div id="${ids.stageHistory.list}" class="stage-history-list hidden"></div>
              </div>
            </section>

            <section id="${ids.panels.failure}" class="detail-tab-panel" data-${data.panel}="failure" role="tabpanel" hidden>
              <div class="status-panel">
                <div class="status-panel-head">
                  <h3>失败诊断</h3>
                  <span class="status-panel-note">结构化失败摘要与排查建议</span>
                </div>
                <div class="failure-action-row">
                  <button id="${ids.failure.rerunButton}" type="button" class="button-link secondary" disabled>从断点恢复/重新运行</button>
                  <span id="${ids.failure.rerunStatus}" class="status-panel-note">失败后如后端允许，可基于已有产物创建恢复任务。</span>
                </div>
                <div class="failure-hero-card">
                  <span class="label">失败摘要</span>
                  <span id="${ids.failure.summary}" class="info-value">-</span>
                </div>
                <div class="info-list detail-info-list">
                  <div class="info-row"><span class="label">分类</span><span id="${ids.failure.category}" class="info-value">-</span></div>
                  <div class="info-row"><span class="label">阶段</span><span id="${ids.failure.stage}" class="info-value">-</span></div>
                  <div class="info-row"><span class="label">根因</span><span id="${ids.failure.rootCause}" class="info-value">-</span></div>
                  <div class="info-row"><span class="label">建议</span><span id="${ids.failure.suggestion}" class="info-value">-</span></div>
                  <div class="info-row"><span class="label">最近日志</span><span id="${ids.failure.lastLogLine}" class="info-value">-</span></div>
                  <div class="info-row"><span class="label">可重试</span><span id="${ids.failure.retryable}" class="info-value">-</span></div>
                </div>
              </div>
            </section>

            <section id="${ids.panels.events}" class="detail-tab-panel" data-${data.panel}="events" role="tabpanel" hidden>
              <div class="status-panel">
                <div class="status-panel-head">
                  <h3>事件流</h3>
                  <span id="${ids.events.status}" class="status-panel-note">全部事件</span>
                </div>
                <p class="events-lead">按时间倒序展示最近事件，适合定位任务卡在哪个阶段以及最后一次失败前发生了什么。</p>
                <div id="${ids.events.empty}" class="events-empty">暂无事件</div>
                <div id="${ids.events.list}" class="events-list hidden"></div>
              </div>
            </section>

            <section id="${ids.panels.translation}" class="detail-tab-panel" data-${data.panel}="translation" role="tabpanel" hidden>
              <div class="status-panel translation-debug-panel">
                <div class="status-panel-head">
                  <h3>翻译调试</h3>
                  <span id="${ids.translation.debugStatus}" class="status-panel-note">按 item 排查为什么没翻译、为什么保留原文</span>
                </div>
                <div id="${ids.translation.debugEmpty}" class="events-empty hidden">暂无翻译调试数据</div>
                <div id="${ids.translation.debugContent}" class="translation-debug-content">
                  <section class="translation-summary-shell">
                    <div class="translation-summary-grid">
                      <div class="translation-summary-card"><span class="label">已翻译</span><span id="${ids.translation.countTranslated}" class="info-value">-</span></div>
                      <div class="translation-summary-card"><span class="label">部分翻译</span><span id="${ids.translation.countPartiallyTranslated}" class="info-value">-</span></div>
                      <div class="translation-summary-card"><span class="label">保留原文</span><span id="${ids.translation.countKeptOrigin}" class="info-value">-</span></div>
                      <div class="translation-summary-card"><span class="label">失败</span><span id="${ids.translation.countFailed}" class="info-value">-</span></div>
                      <div class="translation-summary-card"><span class="label">Provider</span><span id="${ids.translation.providerFamily}" class="info-value">-</span></div>
                    </div>
                    <div class="translation-summary-notes">
                      <span id="${ids.translation.listFilter}" class="status-panel-note">当前列表筛选：-</span>
                    </div>
                  </section>

                  <section class="translation-filter-panel">
                    <div class="translation-filter-row">
                      <label class="translation-filter-field">
                        <span class="label">状态</span>
                        <select id="${ids.translation.filterFinalStatus}">
                          <option value="" selected>全部</option>
                          <option value="translated">已翻译</option>
                          <option value="partially_translated">部分翻译</option>
                          <option value="kept_origin">保留原文</option>
                          <option value="failed">失败</option>
                        </select>
                      </label>
                      <label class="translation-filter-field translation-filter-search">
                        <span class="label">检索</span>
                        <input id="${ids.translation.filterQuery}" type="search" placeholder="输入 item_id、路由、原文片段" />
                      </label>
                      <button id="${ids.translation.filterApply}" type="button" class="button-link secondary">刷新</button>
                    </div>
                  </section>

                  <div class="translation-debug-layout">
                    <section class="translation-debug-column translation-debug-column-list">
                      <div class="translation-debug-subhead"><h4>Item 列表</h4><span id="${ids.translation.itemsMeta}" class="status-panel-note">-</span></div>
                      <div class="translation-panel-body">
                        <div id="${ids.translation.itemsLoading}" class="events-empty hidden">正在读取翻译 item...</div>
                        <div id="${ids.translation.itemsEmpty}" class="events-empty hidden">没有匹配的翻译 item</div>
                        <div id="${ids.translation.itemsList}" class="translation-items-list"></div>
                      </div>
                      <div class="translation-items-pagination">
                        <button id="${ids.translation.itemsPrev}" type="button" class="button-link secondary" disabled>上一页</button>
                        <span id="${ids.translation.itemsPage}" class="status-panel-note">-</span>
                        <button id="${ids.translation.itemsNext}" type="button" class="button-link secondary" disabled>下一页</button>
                      </div>
                    </section>

                    <section class="translation-debug-column translation-debug-column-detail">
                      <div class="translation-debug-subhead"><h4>Item 详情</h4><span id="${ids.translation.itemMeta}" class="status-panel-note">-</span></div>
                      <div class="translation-panel-body translation-panel-body-detail">
                        <div id="${ids.translation.itemLoading}" class="events-empty hidden">正在读取 item 详情...</div>
                        <div id="${ids.translation.itemEmpty}" class="events-empty">请选择左侧 item</div>
                        <div id="${ids.translation.itemDetail}" class="translation-item-detail hidden"></div>
                      </div>
                      <div class="translation-replay-actions">
                        <button id="${ids.translation.itemReplay}" type="button" class="button-link secondary" disabled>重放当前 item</button>
                        <span id="${ids.translation.replayStatus}" class="status-panel-note">-</span>
                      </div>
                      <div id="${ids.translation.replayResult}" class="translation-replay-result hidden"></div>
                    </section>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </form>
    </dialog>
  `;
}
