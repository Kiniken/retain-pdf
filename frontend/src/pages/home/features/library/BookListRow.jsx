// 书架列表视图的行(照搬 PDF_MD_lib 的 BookListRow):小封面缩略图 + 标题/副标题/
// 更新日期 + 右侧眼睛(快速阅读)。点行 → 书籍详情弹窗。数据/动作与卡片一致。

import { memo } from "react";
import { cn } from "@/lib/utils";
import { recentJobTitle } from "../../../../js/features/recent-jobs/card-presenter.js";
import { cardSignatureOf } from "./RecentJobCard.jsx";
import { libraryCardBadge } from "./library-card-badge.js";
import { BadgeIcon } from "./library-card-badge-icon.jsx";
import { useRecentJobCover } from "./useRecentJobCover.js";

function formatDate(value) {
  const raw = `${value || ""}`.trim();
  if (!raw) return "—";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "numeric", day: "numeric" }).format(parsed);
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" width="15" height="15">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}
function IconFile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" width="18" height="18">
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v4h4" />
    </svg>
  );
}
function IconCheck(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" width="12" height="12" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function areEqual(prev, next) {
  return prev.onOpenDetail === next.onOpenDetail
    && prev.onReader === next.onReader
    && prev.onReadSource === next.onReadSource
    && prev.onSelect === next.onSelect
    && prev.batchMode === next.batchMode
    && prev.selected === next.selected
    && prev.onToggleSelect === next.onToggleSelect
    && cardSignatureOf(prev.item) === cardSignatureOf(next.item);
}

function BookListRowImpl({ item, onOpenDetail, onReader, onReadSource, onSelect, batchMode = false, selected = false, onToggleSelect }) {
  const documentId = `${item.document_id || ""}`.trim();
  const jobId = `${item.job_id || ""}`.trim();
  const title = recentJobTitle(item);
  const fullTitle = item.title || item.display_name || item.job_id || "-";
  const pageCount = item.page_count || "-";
  const readerAvailable = `${item.status || ""}`.trim() === "succeeded";
  const badge = libraryCardBadge(item);
  const coverUrl = useRecentJobCover(item);

  function open() {
    if (batchMode) {
      if (documentId) onToggleSelect?.(documentId);
      return;
    }
    if (documentId) { onOpenDetail?.(item); return; }
    onSelect?.(jobId);
  }
  function handleClick(event) {
    if (event.target?.closest?.("button")) return;
    event.preventDefault();
    open();
  }
  function handleKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target?.closest?.("button")) return;
    event.preventDefault();
    open();
  }
  function handleEye(event) {
    event.preventDefault();
    event.stopPropagation();
    if (readerAvailable) { onReader?.(jobId); return; }
    if (documentId) { onReadSource?.(documentId); }
  }

  return (
    <div
      className="recent-job-item group flex w-full cursor-pointer items-start gap-4 rounded-2xl px-3 py-3.5 text-left shadow-[0_1px_0_rgba(0,0,0,0.04)] transition duration-150 ease-[var(--ease-out)] hover:bg-muted/45 active:scale-[0.99] sm:px-4"
      role="button"
      tabIndex={0}
      data-job-id={item.job_id || ""}
      data-document-id={item.document_id || ""}
      data-library-only={item.library_only ? "true" : "false"}
      data-status={item.status || ""}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {batchMode ? (
        <div className={cn(
          "mt-1 flex h-5 w-5 shrink-0 items-center justify-center self-start rounded-full border transition-colors",
          selected ? "border-foreground bg-foreground text-background" : "border-border bg-white text-transparent",
        )} aria-hidden>
          <IconCheck />
        </div>
      ) : null}

      <div className={cn("relative aspect-[3/4] w-11 shrink-0 overflow-hidden rounded-xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] sm:w-12", batchMode && selected && "ring-2 ring-foreground ring-offset-2")}>
        {coverUrl ? (
          <img src={coverUrl} alt="" className="h-full w-full bg-white object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/60 to-background text-muted-foreground/45"><IconFile /></div>
        )}
        {badge ? (
          <div className="absolute right-1 top-1 z-[2]">
            <span className={cn("inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full pl-1.5 pr-2 text-[10px] font-medium shadow-sm", badge.cls)}>
              <BadgeIcon name={badge.icon} />
              {badge.label}
            </span>
          </div>
        ) : null}
      </div>

      <div className="relative min-w-0 flex-1 pr-2 pt-0.5">
        <h3 className="recent-job-id line-clamp-2 min-w-0 text-sm font-semibold leading-snug text-foreground" title={fullTitle}>{title}</h3>
        <p className="mt-2 text-[11px] tabular-nums text-muted-foreground/55">{pageCount} 页 · 更新 {formatDate(item.updated_at)}</p>
      </div>

      {batchMode ? null : (
        <div className="flex shrink-0 items-center self-center">
          <button
            type="button"
            className="recent-job-reader flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-foreground transition hover:bg-muted active:scale-90"
            title={readerAvailable ? "对照阅读" : "读原文"}
            aria-label={readerAvailable ? "对照阅读" : "读原文"}
            onClick={handleEye}
          >
            <IconEye />
          </button>
        </div>
      )}
    </div>
  );
}

export const BookListRow = memo(BookListRowImpl, areEqual);
