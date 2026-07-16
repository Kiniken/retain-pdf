// 图书馆网格单卡 —— 照搬 PDF_MD_lib 的 BookCard 视觉(shadcn / 原始 Tailwind):
// 圆角封面 + 轻阴影 + hover 上浮、右上角状态徽标、hover 暗遮罩 + 白色圆形眼睛
// (点即阅读)、下方标题 + 副标题。删除/翻译/改元数据全在书籍详情弹窗里,卡片
// 只负责"点开详情"和"快速阅读",保持干净(和参考项目一致)。
//
// 根节点保留 .recent-job-item + data-* 属性作为网格子项 / 测试锚点;memo 签名
// (cardSignatureOf)与渲染计数器(测试③渲染隔离用)保留。

import { memo } from "react";
import { cn } from "@/lib/utils";
import {
  isRecentJobActive,
  recentJobProgressPercent,
  recentJobStageLabel,
  recentJobTitle,
} from "../../../../js/features/recent-jobs/card-presenter.js";
import { isLibraryOnlyItem } from "../../../../js/features/documents-library/document-card-item.js";
import { useRecentJobCover } from "./useRecentJobCover.js";

function formatCardDate(value) {
  const raw = `${value || ""}`.trim();
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed);
}

export function cardSignatureOf(item = {}) {
  const progress = item.progress && typeof item.progress === "object" ? item.progress : {};
  const runtimeProgress = item.runtime_status?.progress && typeof item.runtime_status.progress === "object"
    ? item.runtime_status.progress : {};
  return [
    item.job_id, item.document_id, item.library_only ? "lib" : "", item.reading_status,
    item.updated_at, item.status, item.display_stage, item.substage,
    progress.current, progress.total, progress.percent,
    runtimeProgress.current, runtimeProgress.total, runtimeProgress.percent,
    item.title, item.display_name, item.page_count,
    item.cover_url, item.thumbnail_url, item.stage_detail, item.runtime_status?.detail,
  ].map((value) => `${value ?? ""}`).join("|");
}

const renderCountsForTests = new Map();
export function getCardRenderCountForTests(jobId) { return renderCountsForTests.get(jobId) || 0; }
export function resetCardRenderCountsForTests() { renderCountsForTests.clear(); }

// 状态徽标:映射到参考项目 getLibraryCardBadge 的四态(已翻译/处理中/失败/馆藏)。
function badgeOf(item, libraryOnly, active) {
  if (libraryOnly) return { label: "馆藏", cls: "border border-border bg-white/95 text-muted-foreground" };
  const status = `${item.status || ""}`.trim();
  if (active) return { label: "处理中", cls: "bg-primary/12 text-primary" };
  if (status === "succeeded") return { label: "已翻译", cls: "bg-primary text-primary-foreground" };
  if (status === "failed") return { label: "失败", cls: "bg-destructive/12 text-destructive" };
  if (status === "queued") return { label: "排队中", cls: "bg-muted text-muted-foreground" };
  return null;
}

function IconEye(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" width="16" height="16" {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}
function IconFile(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" width="34" height="34" {...props}>
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}

function areCardPropsEqual(prev, next) {
  return prev.onSelect === next.onSelect
    && prev.onReader === next.onReader
    && prev.onReadSource === next.onReadSource
    && prev.onOpenDetail === next.onOpenDetail
    && cardSignatureOf(prev.item) === cardSignatureOf(next.item);
}

function RecentJobCardImpl({ item, onSelect, onReader, onReadSource, onOpenDetail }) {
  const libraryOnly = isLibraryOnlyItem(item);
  const documentId = `${item.document_id || ""}`.trim();
  const jobId = `${item.job_id || ""}`.trim();
  const active = isRecentJobActive(item);
  const title = recentJobTitle(item);
  const fullTitle = item.title || item.display_name || item.job_id || "-";
  const pageCount = item.page_count || "-";
  const updatedAt = formatCardDate(item.updated_at);
  const readerAvailable = `${item.status || ""}`.trim() === "succeeded";
  const badge = badgeOf(item, libraryOnly, active);
  const percent = active ? recentJobProgressPercent(item) : NaN;

  renderCountsForTests.set(jobId, (renderCountsForTests.get(jobId) || 0) + 1);
  const coverUrl = useRecentJobCover(item);

  function openTarget() {
    if (documentId) { onOpenDetail?.(item); return; }
    onSelect?.(jobId);
  }
  function handleCardClick(event) {
    if (event.target?.closest?.("button")) return;
    event.preventDefault();
    openTarget();
  }
  function handleKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target?.closest?.("button")) return;
    event.preventDefault();
    openTarget();
  }
  // 眼睛=快速阅读:已完成→对照阅读;否则→读原文(所有文档都有源 PDF)。
  function handleEye(event) {
    event.preventDefault();
    event.stopPropagation();
    if (readerAvailable) { onReader?.(jobId); return; }
    if (documentId) { onReadSource?.(documentId); }
  }
  const eyeTitle = readerAvailable ? "对照阅读" : "读原文";

  return (
    <div
      className="recent-job-item group text-left"
      role="button"
      tabIndex={0}
      data-job-id={item.job_id || ""}
      data-document-id={item.document_id || ""}
      data-library-only={libraryOnly ? "true" : "false"}
      data-status={item.status || ""}
      data-updated-at={item.updated_at || ""}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      <div className={cn(
        "relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-muted/40 shadow-[0_2px_16px_rgba(0,0,0,0.07)] transition-all duration-200",
        "group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_28px_rgba(0,0,0,0.12)]",
        "group-focus-within:-translate-y-0.5 group-focus-within:shadow-[0_8px_28px_rgba(0,0,0,0.12)]",
      )}>
        {coverUrl ? (
          <img src={coverUrl} alt="" className="h-full w-full bg-white object-contain" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted/60 to-background text-muted-foreground/50">
            <IconFile aria-hidden="true" />
            <span className="text-[10px] text-muted-foreground/60">PDF</span>
          </div>
        )}

        {badge ? (
          <div className="absolute right-2 top-2 z-10">
            <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium shadow-sm", badge.cls)}>
              {badge.label}{active && Number.isFinite(percent) ? ` ${Math.round(percent)}%` : ""}
            </span>
          </div>
        ) : null}

        {active && Number.isFinite(percent) ? (
          <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-black/10">
            <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${percent}%` }} />
          </div>
        ) : null}

        {/* hover 暗遮罩 + 白色圆形眼睛 */}
        <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            className="recent-job-reader pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-foreground shadow-md transition-colors hover:bg-white"
            title={eyeTitle}
            aria-label={eyeTitle}
            onClick={handleEye}
          >
            <IconEye aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-0.5">
        <h3
          className="recent-job-id line-clamp-2 text-xs font-semibold leading-snug text-foreground transition-colors group-hover:text-primary"
          title={fullTitle}
        >
          {title}
        </h3>
        <p className="recent-job-real-id line-clamp-1 text-[10px] text-muted-foreground">{pageCount} 页 · {updatedAt}</p>
      </div>
    </div>
  );
}

export const RecentJobCard = memo(RecentJobCardImpl, areCardPropsEqual);
