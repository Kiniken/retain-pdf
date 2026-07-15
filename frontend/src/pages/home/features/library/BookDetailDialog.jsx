// 书籍详情弹窗 —— 尽量照搬 PDF_MD_lib 的 BookDetailModal 设计:两栏、shadcn 视觉
// (text-muted-foreground / border-border / buttonVariants),用原始 Tailwind 类而不是
// 自定义 @utility,好让视觉和参考项目接近。数据/动作接我们后端,后端没有的功能
// (仅馆藏开关、上传译文/markdown、回收站、覆盖率进度段、作者/年份编辑)不做。

import { useEffect, useMemo, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button.jsx";
import { useHomeServices } from "../../home-services-context.js";
import { useDialogState } from "../../state/use-dialog-state.js";
import { useDialogReturnFocus } from "../../../../shared/react/use-dialog-return-focus.js";
import { fetchDocument } from "../../../../js/api/documents.js";
import { API_PREFIX } from "../../../../js/config/api-constants.js";
import {
  isRecentJobActive,
  recentJobProgressPercent,
  recentJobStageLabel,
  recentJobStatusLabel,
} from "../../../../js/features/recent-jobs/card-presenter.js";
import { isLibraryOnlyItem } from "../../../../js/features/documents-library/document-card-item.js";
import { useRecentJobCover } from "./useRecentJobCover.js";

const READING_STATUSES = [
  { value: "unread", label: "未读" },
  { value: "reading", label: "在读" },
  { value: "done", label: "读完" },
];

function IconEye(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12" {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}
function IconLayers(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12" {...props}>
      <path d="M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 17.5l9 5 9-5" />
    </svg>
  );
}

function parseAuthors(authorsJson) {
  try {
    const parsed = JSON.parse(`${authorsJson || "[]"}`);
    return Array.isArray(parsed) ? parsed.map((a) => `${a}`).filter(Boolean) : [];
  } catch {
    return [];
  }
}
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
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed);
}
function statusOf(item) {
  if (isLibraryOnlyItem(item)) return { label: "未翻译", tone: "muted" };
  if (isRecentJobActive(item)) return { label: recentJobStageLabel(item), tone: "active" };
  const status = `${item.status || ""}`.trim();
  if (status === "succeeded") return { label: "已完成", tone: "done" };
  if (status === "failed") return { label: "失败", tone: "failed" };
  return { label: recentJobStatusLabel(status), tone: "muted" };
}
const btn = (variant, extra = "") => cn(buttonVariants({ variant, size: "sm" }), "h-8 text-xs rounded-md", extra);

export function BookDetailDialog() {
  const services = useHomeServices();
  const { dialogStore } = services.bookDetail;
  const actions = services.library.actions;
  const collectionsCtl = services.collections?.controller;
  const collectionsReload = services.collections?.reloadSignal;
  const dialogState = useDialogState(dialogStore);
  const open = Boolean(dialogState.open);
  const item = dialogState.payload || {};
  const { onCloseAutoFocus } = useDialogReturnFocus(open);

  const documentId = `${item.document_id || ""}`.trim();
  const jobId = `${item.job_id || ""}`.trim();
  const libraryOnly = isLibraryOnlyItem(item);
  const status = statusOf(item);
  const coverUrl = useRecentJobCover(item);

  const [doc, setDoc] = useState(null);
  const [readingStatus, setReadingStatus] = useState("unread");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [titleText, setTitleText] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [tags, setTags] = useState([]);
  const [rangeOn, setRangeOn] = useState(false);
  const [startPage, setStartPage] = useState("1");
  const [endPage, setEndPage] = useState("");
  const [collections, setCollections] = useState([]);
  const [collectionsBusy, setCollectionsBusy] = useState("");

  useEffect(() => {
    if (!open || !documentId) {
      setDoc(null); setError(""); setConfirmingDelete(false); setEditing(false);
      setRangeOn(false); setBusy(""); setCollections([]);
      return undefined;
    }
    let cancelled = false;
    const initialTags = Array.isArray(item.tags) ? item.tags : [];
    setReadingStatus(item.reading_status || "unread");
    setTitleText(item.title || item.display_name || "");
    setTags(initialTags);
    setTagsText(initialTags.join("、"));
    fetchDocument(API_PREFIX, documentId).then((full) => {
      if (cancelled) return;
      setDoc(full);
      setReadingStatus(full.reading_status || "unread");
      setTitleText(full.title || full.source_filename || "");
      const fullTags = Array.isArray(full.tags) ? full.tags : [];
      setTags(fullTags);
      setTagsText(fullTags.join("、"));
      setEndPage(`${full.page_count || ""}`);
    }).catch(() => {});
    if (collectionsCtl) {
      collectionsCtl.listCollections().then(async (list) => {
        const rows = Array.isArray(list?.collections) ? list.collections : (Array.isArray(list) ? list : []);
        const withMembership = await Promise.all(rows.map(async (col) => {
          let member = false;
          try { member = (await collectionsCtl.listCollectionDocumentIds(col.collection_id)).includes(documentId); } catch { member = false; }
          return { collection_id: col.collection_id, name: col.name, member };
        }));
        if (!cancelled) setCollections(withMembership);
      }).catch(() => {});
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentId]);

  const authors = useMemo(() => parseAuthors(doc?.authors_json), [doc?.authors_json]);
  const pageCount = doc?.page_count || item.page_count || 0;
  const percent = isRecentJobActive(item) ? recentJobProgressPercent(item) : NaN;
  const readerAvailable = `${item.status || ""}`.trim() === "succeeded";
  const canTranslate = libraryOnly || `${item.status || ""}`.trim() === "failed";
  const isActive = isRecentJobActive(item);
  const memberCollections = collections.filter((c) => c.member).map((c) => c.name);

  const close = () => dialogStore.close();
  const handleOpenChange = (next) => { if (!next) close(); };

  async function withBusy(key, fn, failMessage) {
    setBusy(key); setError("");
    try { await fn(); } catch (err) { setError(err?.message || failMessage); } finally { setBusy(""); }
  }
  async function handleReadingStatus(value) {
    if (value === readingStatus || busy) return;
    const previous = readingStatus;
    setReadingStatus(value);
    await withBusy("reading", () => actions.updateDocument(documentId, { reading_status: value }), "更新阅读状态失败")
      .catch(() => setReadingStatus(previous));
  }
  function startEdit() {
    setTitleText(doc?.title || item.title || item.display_name || "");
    setTagsText((tags || []).join("、"));
    setEditing(true);
  }
  async function handleSaveEdit() {
    const nextTags = tagsText.split(/[，,、\s]+/).map((t) => t.trim()).filter(Boolean);
    const nextTitle = titleText.trim();
    await withBusy("meta", async () => {
      const updated = await actions.updateDocument(documentId, { title: nextTitle || undefined, tags: nextTags });
      if (updated) setDoc(updated);
      setTags(nextTags); setEditing(false);
    }, "保存失败");
  }
  async function handleTranslate() {
    const payload = {};
    if (rangeOn) {
      const s = Number(startPage), e = Number(endPage);
      if (!Number.isInteger(s) || !Number.isInteger(e) || s < 1 || e < s || (pageCount && e > pageCount)) {
        setError(`页码范围不合法（1–${pageCount || "总页数"}）`); return;
      }
      payload.ocr = { page_ranges: `${s}-${e}` };
      payload.translation = { start_page: s, end_page: e };
    }
    await withBusy("translate", async () => { await actions.translateDocument(documentId, payload); close(); }, "发起翻译失败");
  }
  async function handleDelete() {
    if (!confirmingDelete) { setConfirmingDelete(true); return; }
    await withBusy("delete", async () => { await actions.deleteDocument(documentId); close(); }, "删除失败");
  }
  async function toggleCollection(collectionId, nextMember) {
    if (!collectionsCtl || collectionsBusy) return;
    setCollectionsBusy(collectionId); setError("");
    try {
      if (nextMember) await collectionsCtl.addDocuments(collectionId, [documentId]);
      else await collectionsCtl.removeDocument(collectionId, documentId);
      setCollections((prev) => prev.map((c) => (c.collection_id === collectionId ? { ...c, member: nextMember } : c)));
      collectionsReload?.actions.bump();
    } catch (err) { setError(err?.message || "更新合集失败"); } finally { setCollectionsBusy(""); }
  }

  const toneText = status.tone === "done" ? "text-emerald-600"
    : status.tone === "active" ? "text-primary"
    : status.tone === "failed" ? "text-destructive" : "text-muted-foreground";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="desktop-dialog-overlay" />
        <DialogPrimitive.Content
          id="book-detail-dialog"
          className="fixed inset-0 z-[101] m-auto h-fit w-[min(940px,94vw)] max-h-[88vh] overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-[0_30px_60px_rgba(15,23,42,0.22)] sm:p-7"
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <DialogPrimitive.Title asChild><h2 className="sr-only">书籍详情</h2></DialogPrimitive.Title>
          <DialogPrimitive.Close asChild>
            <button id="book-detail-close-btn" type="button" aria-label="关闭"
              className="absolute right-4 top-4 z-[2] inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">×</button>
          </DialogPrimitive.Close>

          <div className="grid grid-cols-1 gap-7 sm:grid-cols-[236px_1fr]">
            {/* ── 左栏:封面 + 摘要 ── */}
            <div>
              <div className="sticky top-0 space-y-3">
                <div
                  className="mx-auto flex aspect-[3/4] w-full max-w-[220px] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted bg-cover bg-center shadow-[0_10px_26px_rgba(15,23,42,0.14)] sm:mx-0 sm:max-w-none"
                  style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}
                >
                  {coverUrl ? null : <span className="text-xs text-muted-foreground">无封面</span>}
                </div>
                <div className="space-y-1 px-0.5 text-xs text-muted-foreground">
                  <p>{[pageCount ? `${pageCount} 页` : "", formatBytes(doc?.bytes)].filter(Boolean).join(" · ")}</p>
                  {formatDate(doc?.added_at) ? <p>入库 {formatDate(doc.added_at)}</p> : null}
                  <p className="flex items-center gap-1.5 border-t border-border/30 pt-1.5">
                    <IconLayers className="shrink-0" />
                    <span className="truncate">{memberCollections.length ? memberCollections.join("、") : "未加入合集"}</span>
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  {readerAvailable ? (
                    <button id="book-detail-compare-btn" className={btn("default", "w-full")} disabled={Boolean(busy)}
                      onClick={() => { actions.openJobReader(jobId); close(); }}>对照阅读</button>
                  ) : null}
                  <button id="book-detail-read-source-btn" className={btn(readerAvailable ? "outline" : "default", "w-full")}
                    disabled={Boolean(busy) || !documentId} onClick={() => { actions.openSourceReader(documentId); close(); }}>
                    <IconEye className="mr-1" />查看原版
                  </button>
                </div>
              </div>
            </div>

            {/* ── 右栏:工作台 ── */}
            <div className="min-w-0 space-y-5">
              {/* 标题区 */}
              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <div className="space-y-2.5">
                      <input id="book-detail-title-input" type="text" value={titleText} autoFocus
                        onChange={(e) => setTitleText(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">标签（逗号或顿号分隔）</p>
                        <input id="book-detail-tags-input" type="text" value={tagsText} placeholder="例如：化学、综述"
                          onChange={(e) => setTagsText(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button className={btn("outline")} disabled={busy === "meta"} onClick={() => setEditing(false)}>取消</button>
                        <button id="book-detail-save-btn" className={btn("default")} disabled={busy === "meta"} onClick={handleSaveEdit}>
                          {busy === "meta" ? "保存中…" : "保存"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 className="book-detail-title line-clamp-2 break-words text-xl font-bold leading-snug tracking-tight" title={doc?.title || titleText}>
                        {doc?.title || titleText || "-"}
                      </h1>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {authors.length ? authors.join("、") : "未知作者"}
                        {doc?.year ? ` · ${doc.year}` : ""}
                      </p>
                      {tags.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {tags.map((t) => <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{t}</span>)}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
                {!editing ? (
                  <button id="book-detail-edit-btn" type="button" onClick={startEdit}
                    className="shrink-0 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">编辑</button>
                ) : null}
              </div>

              {/* 状态 + 翻译工作台 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={cn("book-detail-status text-sm font-medium", toneText)}>
                    {status.label}{Number.isFinite(percent) ? ` · ${Math.round(percent)}%` : ""}
                  </span>
                </div>

                {isActive ? (
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-sm border border-border bg-muted">
                      <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${Number.isFinite(percent) ? percent : 0}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">{recentJobStageLabel(item)}</p>
                  </div>
                ) : null}

                {canTranslate ? (
                  <div className="space-y-2.5 rounded-lg border border-border/60 bg-muted/15 px-3.5 py-3">
                    <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" className="h-4 w-4 rounded border-muted-foreground/40" checked={rangeOn} onChange={(e) => setRangeOn(e.target.checked)} />
                      指定页码范围（不勾选 = 整本翻译）
                    </label>
                    {rangeOn ? (
                      <div className="flex items-center gap-2">
                        <input type="number" min="1" value={startPage} aria-label="起始页" onChange={(e) => setStartPage(e.target.value)}
                          className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm" />
                        <span className="text-xs text-muted-foreground">–</span>
                        <input type="number" min="1" value={endPage} aria-label="结束页" onChange={(e) => setEndPage(e.target.value)}
                          className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm" />
                        <span className="text-[11px] text-muted-foreground/70">共 {pageCount || "?"} 页</span>
                      </div>
                    ) : null}
                    <button id="book-detail-translate-btn" className={btn("default")} disabled={Boolean(busy)} onClick={handleTranslate}>
                      {busy === "translate" ? "提交中…" : (rangeOn ? "翻译选定页码" : "翻译整本")}
                    </button>
                  </div>
                ) : readerAvailable ? (
                  <p className="text-xs text-muted-foreground">已翻译完成，可在左侧「对照阅读」查看译文。</p>
                ) : null}
              </div>

              {/* 阅读状态 */}
              <div className="space-y-1.5 border-t border-border/30 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">阅读状态</p>
                <div className="inline-flex overflow-hidden rounded-md border border-border" role="group" aria-label="阅读状态">
                  {READING_STATUSES.map((s) => (
                    <button key={s.value} type="button" disabled={busy === "reading"}
                      onClick={() => handleReadingStatus(s.value)}
                      className={cn(
                        "book-detail-reading-btn border-r border-border px-4 py-1.5 text-xs last:border-r-0 disabled:opacity-60",
                        readingStatus === s.value ? "is-active bg-primary text-primary-foreground" : "bg-white text-muted-foreground hover:bg-accent",
                      )}>{s.label}</button>
                  ))}
                </div>
              </div>

              {/* 合集 */}
              {collections.length ? (
                <div className="space-y-1.5 border-t border-border/30 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">合集</p>
                  <div className="flex flex-wrap gap-2">
                    {collections.map((c) => (
                      <button key={c.collection_id} type="button" disabled={collectionsBusy === c.collection_id}
                        onClick={() => toggleCollection(c.collection_id, !c.member)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-55",
                          c.member ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-muted-foreground hover:bg-accent",
                        )}>{c.member ? "✓ " : "+ "}{c.name}</button>
                    ))}
                  </div>
                </div>
              ) : null}

              {error ? <p className="text-xs text-destructive">{error}</p> : null}

              <div className="border-t border-border/30 pt-3">
                <button id="book-detail-delete-btn" type="button" disabled={Boolean(busy)}
                  onClick={handleDelete}
                  className={cn("text-sm text-destructive hover:underline disabled:opacity-55", confirmingDelete && "font-semibold")}>
                  {confirmingDelete ? "确认删除这本书？" : "删除"}
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
