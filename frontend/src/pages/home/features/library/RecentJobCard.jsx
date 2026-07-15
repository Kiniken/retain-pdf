// 图书馆网格单卡(蓝图 §2 features/library/,逐节点镜像
// src/js/components/recent-jobs/recent-job-card.js 的 DOM 结构/类名——CSS
// 选择器平权,className 字符串一字不改)。
//
// 与旧自定义元素的关键差异:
// - 删除确认 popover 状态提升到 RecentJobsLibrary 的 confirmingDeleteJobId
//   useState(蓝图 §2),不再是每卡私有的 classList 状态;
// - 不再 dispatch recent-job-select/-delete/-reader 三个 CustomEvent,直接
//   调用 onSelect/onDelete/onReader(props,稳定引用,由 Library 传入
//   recentJobActions.selectJob/deleteJob/openJobReader 本尊);
// - 封面图交给 useRecentJobCover hook(§useRecentJobCover.js),不在本文件
//   处理 objectURL 生命周期。

import { memo } from "react";
import {
  isRecentJobActive,
  recentJobProgressPercent,
  recentJobStageLabel,
  recentJobStatusLabel,
  recentJobTitle,
} from "../../../../js/features/recent-jobs/card-presenter.js";
import { isLibraryOnlyItem } from "../../../../js/features/documents-library/document-card-item.js";
import { useRecentJobCover } from "./useRecentJobCover.js";

// 卡片底部日期:书架卡片是概览列表,不需要 job/formatters.js#formatEventTimestamp
// 那种事件时间线级别的秒精度——只显示到日期,和"69 页 ·"拼在一起不会太挤。
function formatCardDate(value) {
  const raw = `${value || ""}`.trim();
  if (!raw) {
    return "-";
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

// 卡片级 memo 签名(蓝图 §3.2):只有这些字段变化才判定卡片"脏"。
// 1s 轮询下 recentJobsStore 每次都返回新的 frozen clone,不能靠 item 引用
// 相等——必须靠内容签名比较,否则 24 张卡片会随任意一张的补丁全部重渲。
export function cardSignatureOf(item = {}) {
  const progress = item.progress && typeof item.progress === "object" ? item.progress : {};
  const runtimeProgress = item.runtime_status?.progress && typeof item.runtime_status.progress === "object"
    ? item.runtime_status.progress
    : {};
  return [
    item.job_id,
    item.document_id,
    item.library_only ? "lib" : "",
    item.reading_status,
    item.updated_at,
    item.status,
    item.display_stage,
    item.substage,
    progress.current, progress.total, progress.percent,
    runtimeProgress.current, runtimeProgress.total, runtimeProgress.percent,
    item.title, item.display_name, item.page_count,
    item.cover_url, item.thumbnail_url,
    item.stage_detail, item.runtime_status?.detail,
  ].map((value) => `${value ?? ""}`).join("|");
}

// 测试专用渲染计数(镜像 connected-job-status-card.js 的
// resetConnectedJobStatusCardForTests 模式):卡片渲染隔离测试(蓝图 §6 新增
// 测试③)需要断言"其余卡片未重渲",黑盒 DOM 比对无法区分"React 判定
// props 相等而跳过 render 函数体执行"与"render 了但输出恰好相同"——这里在
// 组件函数体入口直接计数,是唯一可靠的断言口径。生产路径零开销(计数器
// 本身不影响渲染输出)。
const renderCountsForTests = new Map();

export function getCardRenderCountForTests(jobId) {
  return renderCountsForTests.get(jobId) || 0;
}

export function resetCardRenderCountsForTests() {
  renderCountsForTests.clear();
}

function areCardPropsEqual(prevProps, nextProps) {
  return prevProps.onSelect === nextProps.onSelect
    && prevProps.onDelete === nextProps.onDelete
    && prevProps.onReader === nextProps.onReader
    && prevProps.onReadSource === nextProps.onReadSource
    && prevProps.onTranslate === nextProps.onTranslate
    && prevProps.onOpenDetail === nextProps.onOpenDetail
    && prevProps.isConfirmingDelete === nextProps.isConfirmingDelete
    && prevProps.onToggleDeleteConfirm === nextProps.onToggleDeleteConfirm
    && cardSignatureOf(prevProps.item) === cardSignatureOf(nextProps.item);
}

function RecentJobCardImpl({
  item,
  isConfirmingDelete = false,
  onSelect,
  onDelete,
  onReader,
  onReadSource,
  onTranslate,
  onOpenDetail,
  onToggleDeleteConfirm,
}) {
  const libraryOnly = isLibraryOnlyItem(item);
  const documentId = `${item.document_id || ""}`.trim();
  const active = isRecentJobActive(item);
  const title = recentJobTitle(item);
  const pageCount = item.page_count || "-";
  const updatedAt = formatCardDate(item.updated_at);
  const fullTitle = item.title || item.display_name || item.job_id || "-";
  const jobId = `${item.job_id || ""}`.trim();
  // 只有翻译流程真正跑完(succeeded)才有完整的原文/译文 PDF 可对照——排队中/
  // 进行中/失败/已取消的任务点"对照阅读"以前会一路捅到阅读器里的
  // use-reader-boot.js,那边的 loadReaderPayload/mountReaderPdfPair 深处才
  // 报错("对照阅读加载失败"),体验上是个没头没尾的失败提示。这里提前挡掉,
  // 按钮直接不可点,不再依赖阅读器那层的兜底报错。
  const readerAvailable = `${item.status || ""}`.trim() === "succeeded";
  // 馆藏文档:眼睛按钮改成"读原文"(只读源文档),有 document_id 即可点。
  const canReadSource = libraryOnly && Boolean(documentId);
  const readerBtnEnabled = libraryOnly ? canReadSource : readerAvailable;
  renderCountsForTests.set(jobId, (renderCountsForTests.get(jobId) || 0) + 1);
  const coverUrl = useRecentJobCover(item);

  const percent = active ? recentJobProgressPercent(item) : NaN;
  const percentText = Number.isFinite(percent) ? `${Math.round(percent)}%` : "";
  const barWidth = Number.isFinite(percent) ? `${percent.toFixed(2)}%` : "0%";

  function openTarget() {
    // 文档卡片:点开书籍详情弹窗(读原文/对照阅读/翻译/删除/改元数据都在里面)。
    // 极少见的运行时插入 job 项(没有 document_id)退回原来的 job 状态视图。
    if (documentId) {
      onOpenDetail?.(item);
      return;
    }
    onSelect?.(jobId);
  }

  function handleCardClick(event) {
    if (event.target?.closest?.("button")) {
      return;
    }
    event.preventDefault();
    openTarget();
  }

  function handleKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    if (event.target?.closest?.("button")) {
      return;
    }
    event.preventDefault();
    openTarget();
  }

  function handleReaderClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (libraryOnly) {
      if (canReadSource) {
        onReadSource?.(documentId);
      }
      return;
    }
    if (!readerAvailable) {
      return;
    }
    onReader?.(jobId);
  }

  function handleTranslateClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!canReadSource) {
      return;
    }
    onTranslate?.(documentId);
  }

  function handleDeleteToggle(event) {
    event.preventDefault();
    event.stopPropagation();
    onToggleDeleteConfirm?.(isConfirmingDelete ? "" : jobId);
  }

  function handleDeleteCancel(event) {
    event.preventDefault();
    event.stopPropagation();
    onToggleDeleteConfirm?.("");
  }

  function handleDeleteConfirm(event) {
    event.preventDefault();
    event.stopPropagation();
    onToggleDeleteConfirm?.("");
    // 传完整身份,由 composition 决定走文档级删除(有 document_id)还是老的
    // job 删除(极少见的运行时插入 job 项没有 document_id)。
    onDelete?.({ documentId, jobId });
  }

  return (
    <div
      className={`recent-job-item ${active ? "is-active-job" : ""}${libraryOnly ? " is-library-only" : ""}`.trim()}
      role="button"
      tabIndex={0}
      data-job-id={item.job_id || ""}
      data-document-id={item.document_id || ""}
      data-library-only={libraryOnly ? "true" : "false"}
      data-status={item.status || ""}
      data-updated-at={item.updated_at || ""}
      data-display-stage={item.display_stage || ""}
      data-substage={item.substage || ""}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      <div className="recent-job-cover-wrap">
        <div
          className={`recent-job-cover${coverUrl ? " has-image" : ""}`}
          style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}
        >
          <span className="recent-job-cover-fallback" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M9 12.5h6M9 15.5h6M9 9.5h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </span>
          {active ? (
            <div className="recent-job-active-overlay" aria-label={recentJobStageLabel(item)}>
              <span className="recent-job-active-label">{recentJobStageLabel(item)}</span>
              {percentText ? <span className="recent-job-active-percent">{percentText}</span> : null}
              <span className="recent-job-active-track" aria-hidden="true">
                <span className="recent-job-active-bar" style={{ width: barWidth }} />
              </span>
            </div>
          ) : null}
          <div className="recent-job-hover-actions">
            <button
              type="button"
              className={`recent-job-hover-btn recent-job-reader${readerBtnEnabled ? "" : " is-disabled"}`}
              title={libraryOnly
                ? (canReadSource ? "读原文" : "源文件不可用")
                : (readerAvailable ? "对照阅读" : "任务未完成，暂无法对照阅读")}
              aria-label={libraryOnly ? "读原文" : "对照阅读"}
              aria-disabled={readerBtnEnabled ? undefined : "true"}
              onClick={handleReaderClick}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.8 12s3.4-5.8 9.2-5.8S21.2 12 21.2 12s-3.4 5.8-9.2 5.8S2.8 12 2.8 12Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
              </svg>
            </button>
            {/* 馆藏文档专属:以后再翻(复用已存的源文件起翻译 job,不用重新上传) */}
            {libraryOnly ? (
              <button
                type="button"
                className={`recent-job-hover-btn recent-job-translate${canReadSource ? "" : " is-disabled"}`}
                title="翻译这本书"
                aria-label="翻译"
                aria-disabled={canReadSource ? undefined : "true"}
                onClick={handleTranslateClick}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 6h9M8.5 6v1.6c0 3.2-1.9 6-4.5 7.4M6 10.4c.9 2.3 2.8 4 5.1 4.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13 20l3.6-9 3.6 9M14.6 17h5.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
        <span className="recent-job-status">
          {libraryOnly
            ? "未翻译"
            : (active ? recentJobStageLabel(item) : recentJobStatusLabel(item.status))}
        </span>
        {/* 文档级删除对馆藏和已翻译文档一视同仁(后端已补 DELETE /documents/:id):
            删掉整篇文档 + 名下所有 job/upload/文件。 */}
        <button
          type="button"
          className="recent-job-delete"
          title="删除"
          aria-label={libraryOnly ? "删除文档" : "删除任务"}
          aria-expanded={isConfirmingDelete ? "true" : "false"}
          onClick={handleDeleteToggle}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M10 11v6M14 11v6M9 7l1-2h4l1 2M6 7l1 14h10l1-14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div
          className="recent-job-delete-popover"
          role="group"
          aria-label="确认删除"
          hidden={!isConfirmingDelete}
          inert={!isConfirmingDelete ? true : undefined}
        >
          <div>删除这本书？</div>
          <div className="recent-job-delete-actions">
            <button type="button" className="recent-job-delete-cancel" onClick={handleDeleteCancel}>取消</button>
            <button type="button" className="recent-job-delete-confirm" onClick={handleDeleteConfirm}>删除</button>
          </div>
        </div>
      </div>
      <div className="recent-job-title-wrap">
        <span className="recent-job-id" title={fullTitle}>{title}</span>
        <span className="recent-job-real-id mono">{pageCount} 页 · {updatedAt}</span>
      </div>
    </div>
  );
}

export const RecentJobCard = memo(RecentJobCardImpl, areCardPropsEqual);
