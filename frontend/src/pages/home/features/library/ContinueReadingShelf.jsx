// "继续阅读"书架(照搬 PDF_MD_lib 的 LibraryContinueReading):展示最近在读
// (reading_status==="reading",按 last_opened_at/updated_at 倒序)的文档,点开
// 直接续读(已翻译→对照阅读,否则→读原文)。无在读文档时不渲染。

import { useMemo } from "react";
import { recentJobTitle } from "../../../../js/features/recent-jobs/card-presenter.js";
import { useRecentJobCover } from "./useRecentJobCover.js";

const MAX_SHELF = 8;

function ContinueReadingCard({ item, onOpen }) {
  const coverUrl = useRecentJobCover(item);
  const title = recentJobTitle(item);
  const fullTitle = item.title || item.display_name || "-";
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex items-center gap-3 rounded-2xl border border-border/40 bg-white/60 p-2 pr-3 text-left transition-colors hover:bg-muted/40"
    >
      <div className="relative h-[74px] w-[50px] shrink-0 overflow-hidden rounded-xl bg-muted/35">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="h-full w-full bg-white object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/60 to-background text-muted-foreground/55">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" width="22" height="22"><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v4h4" /></svg>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-foreground" title={fullTitle}>{title}</h3>
        <p className="mt-1 text-[10px] text-muted-foreground">{item.page_count || "-"} 页 · 在读</p>
      </div>
    </button>
  );
}

export function ContinueReadingShelf({ items, onOpen }) {
  const reading = useMemo(() => {
    return (Array.isArray(items) ? items : [])
      .filter((item) => `${item.reading_status || ""}`.trim() === "reading")
      .sort((a, b) => `${b.last_opened_at || b.updated_at || ""}`.localeCompare(`${a.last_opened_at || a.updated_at || ""}`))
      .slice(0, MAX_SHELF);
  }, [items]);

  if (!reading.length) {
    return null;
  }

  return (
    <section className="mb-6" aria-label="继续阅读">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">继续阅读</h2>
        <span className="text-[11px] tabular-nums text-muted-foreground/45">{reading.length} 本</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {reading.map((item) => (
          <ContinueReadingCard key={item.job_id} item={item} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
