// 书架筛选(照搬 PDF_MD_lib 的 LibraryFilterModal,做成轻量 popover 而非 Radix
// 弹窗——满载测试下少一个重型 modal 更稳):按状态 + 标签筛选,客户端过滤已加载项。

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const STATUS_FILTERS = [
  { value: "all", label: "全部" },
  { value: "done", label: "已翻译" },
  { value: "untranslated", label: "未翻译" },
  { value: "active", label: "翻译中" },
  { value: "failed", label: "失败" },
];

export function LibraryFilterMenu({
  statusFilter, setStatusFilter,
  tagFilter, setTagFilter,
  tags = [],
  statusCounts = {},
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const activeCount = (statusFilter !== "all" ? 1 : 0) + (tagFilter ? 1 : 0);

  useEffect(() => {
    if (!open) return undefined;
    function onDown(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function Pill({ active, onClick, children }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors",
          active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-muted-foreground hover:bg-accent",
        )}
      >{children}</button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs transition-colors",
          activeCount > 0 ? "bg-secondary text-secondary-foreground" : "border border-border text-foreground hover:bg-muted/30",
        )}
      >
        筛选
        {activeCount > 0 ? <span className="tabular-nums text-[11px] text-muted-foreground/70">{activeCount}</span> : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-border bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">翻译状态</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => (
              <Pill key={s.value} active={statusFilter === s.value} onClick={() => setStatusFilter(s.value)}>
                {s.label}{s.value !== "all" && statusCounts[s.value] ? ` ${statusCounts[s.value]}` : ""}
              </Pill>
            ))}
          </div>

          {tags.length ? (
            <>
              <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">标签</p>
              <div className="flex flex-wrap gap-2">
                <Pill active={!tagFilter} onClick={() => setTagFilter("")}>全部</Pill>
                {tags.map((t) => (
                  <Pill key={t} active={tagFilter === t} onClick={() => setTagFilter(tagFilter === t ? "" : t)}>{t}</Pill>
                ))}
              </div>
            </>
          ) : null}

          {activeCount > 0 ? (
            <button
              type="button"
              onClick={() => { setStatusFilter("all"); setTagFilter(""); }}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground hover:underline"
            >清空筛选</button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// 客户端筛选谓词(和 sort 一样只作用已加载项)。
export function matchesLibraryFilter(item, statusFilter, tagFilter, { isLibraryOnly, isActive }) {
  if (tagFilter && !(Array.isArray(item.tags) ? item.tags : []).includes(tagFilter)) {
    return false;
  }
  if (statusFilter === "all") {
    return true;
  }
  const lib = isLibraryOnly(item);
  const status = `${item.status || ""}`.trim();
  switch (statusFilter) {
    case "untranslated": return lib;
    case "done": return !lib && status === "succeeded";
    case "active": return !lib && isActive(item);
    case "failed": return !lib && status === "failed";
    default: return true;
  }
}
