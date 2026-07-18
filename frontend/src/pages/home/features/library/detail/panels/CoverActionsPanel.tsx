// 左栏：封面 + 元信息摘要 + 对照/原版主操作。
// 与右栏 panel 同级拆分，容器只拼装。

import { btn, IconCompare, IconEye, IconLayers } from "./ui.jsx";
import { BookCardProcessingOverlay } from "../../display/BookCardProcessingOverlay.jsx";

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  const raw = `${value || ""}`.trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

/**
 * @param {object} props
 * @param {string} props.coverUrl
 * @param {number} props.pageCount
 * @param {number|undefined} props.bytes
 * @param {string} [props.addedAt]
 * @param {string[]} props.memberCollections
 * @param {boolean} props.readerAvailable
 * @param {string} props.documentId
 * @param {string|boolean} props.busy
 * @param {boolean} [props.processing] 翻译/重试进行中：封面中央 loading
 * @param {() => void} props.onCompare
 * @param {() => void} props.onReadSource
 */
export function CoverActionsPanel({
  coverUrl,
  pageCount,
  bytes,
  addedAt,
  memberCollections,
  readerAvailable,
  documentId,
  busy,
  processing = false,
  onCompare,
  onReadSource,
}) {
  return (
    <div className="sticky top-0 space-y-3">
      <div
        className="relative mx-auto flex aspect-[3/4] w-full max-w-[220px] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted bg-cover bg-center shadow-[0_10px_26px_rgba(15,23,42,0.14)] sm:mx-0 sm:max-w-none"
        style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}
        data-cover-processing={processing ? "true" : "false"}
      >
        {coverUrl ? null : <span className="text-xs text-muted-foreground">无封面</span>}
        {processing ? <BookCardProcessingOverlay /> : null}
      </div>
      <div className="space-y-1 px-0.5 text-xs text-muted-foreground">
        <p>{[pageCount ? `${pageCount} 页` : "", formatBytes(bytes)].filter(Boolean).join(" · ")}</p>
        {formatDate(addedAt) ? <p>入库 {formatDate(addedAt)}</p> : null}
        <p className="flex items-center gap-1.5 border-t border-border/30 pt-1.5">
          <IconLayers className="shrink-0" />
          <span className="truncate">
            {memberCollections.length ? memberCollections.join("、") : "未加入合集"}
          </span>
        </p>
      </div>
      <div className="flex flex-col gap-2 pt-1">
        {readerAvailable ? (
          <button
            id="book-detail-compare-btn"
            className={btn("default", "w-full")}
            disabled={Boolean(busy)}
            onClick={onCompare}
          >
            <IconCompare className="mr-1" />
            对照阅读
          </button>
        ) : null}
        <button
          id="book-detail-read-source-btn"
          className={btn(readerAvailable ? "outline" : "default", "w-full")}
          disabled={Boolean(busy) || !documentId}
          onClick={onReadSource}
        >
          <IconEye className="mr-1" />
          查看原版
        </button>
      </div>
    </div>
  );
}
