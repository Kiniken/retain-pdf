// 书籍详情弹窗(参考 PDF_MD_lib 的 BookDetailModal,按我们后端能力裁剪)。
//
// 点网格卡片打开:展示封面 + 元数据(标题/作者/年份/页数/大小/日期),状态徽标
// (未翻译 / 翻译中带进度 / 已完成 / 失败),阅读状态切换(未读/在读/读完),
// 可编辑标题与标签,动作:读原文 / 对照阅读(已完成) / 翻译(可选页码范围) /
// 删除。作者/年份/DOI 后端 PATCH 不支持,只读展示。
//
// 同其余对话框一路:DialogPrimitive.Root/Portal/Overlay/Content + desktop-shell +
// useDialogReturnFocus。payload = 被点开的卡片 item;打开后再拉一次完整文档补齐
// 卡片上没有的字段。

import { useEffect, useMemo, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Button } from "../../../../components/Button.jsx";
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
  if (!Number.isFinite(n) || n <= 0) {
    return "";
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(0)} KB`;
  }
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  const raw = `${value || ""}`.trim();
  if (!raw) {
    return "";
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed);
}

// 状态徽标:复用卡片那套判定(有真实 job 时读活态,馆藏则"未翻译")。
function statusOf(item) {
  if (isLibraryOnlyItem(item)) {
    return { key: "library", label: "未翻译", tone: "muted" };
  }
  if (isRecentJobActive(item)) {
    return { key: "active", label: recentJobStageLabel(item), tone: "active" };
  }
  const status = `${item.status || ""}`.trim();
  if (status === "succeeded") {
    return { key: "done", label: "已完成", tone: "done" };
  }
  if (status === "failed") {
    return { key: "failed", label: "失败", tone: "failed" };
  }
  return { key: status || "unknown", label: recentJobStatusLabel(status), tone: "muted" };
}

export function BookDetailDialog() {
  const services = useHomeServices();
  const { dialogStore } = services.bookDetail;
  const actions = services.library.actions;
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
  const [tagsText, setTagsText] = useState("");
  const [titleText, setTitleText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [startPage, setStartPage] = useState("");
  const [endPage, setEndPage] = useState("");

  useEffect(() => {
    if (!open || !documentId) {
      setDoc(null);
      setError("");
      setConfirmingDelete(false);
      setTranslateOpen(false);
      setBusy("");
      return undefined;
    }
    let cancelled = false;
    setReadingStatus(item.reading_status || "unread");
    setTagsText((Array.isArray(item.tags) ? item.tags : []).join("、"));
    setTitleText(item.title || item.display_name || "");
    fetchDocument(API_PREFIX, documentId)
      .then((full) => {
        if (cancelled) {
          return;
        }
        setDoc(full);
        setReadingStatus(full.reading_status || "unread");
        setTagsText((Array.isArray(full.tags) ? full.tags : []).join("、"));
        setTitleText(full.title || full.source_filename || "");
        setStartPage("1");
        setEndPage(`${full.page_count || ""}`);
      })
      .catch(() => {
        // 拉详情失败不致命:卡片 item 已够展示基本信息
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentId]);

  const authors = useMemo(() => parseAuthors(doc?.authors_json), [doc?.authors_json]);
  const pageCount = doc?.page_count || item.page_count || 0;
  const percent = isRecentJobActive(item) ? recentJobProgressPercent(item) : NaN;

  function handleOpenChange(nextOpen) {
    if (!nextOpen) {
      dialogStore.close();
    }
  }

  async function withBusy(key, fn, failMessage) {
    setBusy(key);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err?.message || failMessage);
    } finally {
      setBusy("");
    }
  }

  async function handleReadingStatus(value) {
    if (value === readingStatus) {
      return;
    }
    const previous = readingStatus;
    setReadingStatus(value);
    await withBusy("reading", async () => {
      await actions.updateDocument(documentId, { reading_status: value });
    }, "更新阅读状态失败").catch(() => setReadingStatus(previous));
  }

  async function handleSaveMeta() {
    const nextTags = tagsText.split(/[，,、\s]+/).map((t) => t.trim()).filter(Boolean);
    const nextTitle = titleText.trim();
    await withBusy("meta", async () => {
      const updated = await actions.updateDocument(documentId, {
        title: nextTitle || undefined,
        tags: nextTags,
      });
      if (updated) {
        setDoc(updated);
      }
    }, "保存失败");
  }

  async function handleTranslate() {
    const payload = {};
    const s = Number(startPage);
    const e = Number(endPage);
    const full = !startPage && !endPage;
    const wholeDoc = s === 1 && e === pageCount;
    if (!full && !wholeDoc) {
      if (!Number.isInteger(s) || !Number.isInteger(e) || s < 1 || e < s || (pageCount && e > pageCount)) {
        setError(`页码范围不合法（1–${pageCount || "总页数"}）`);
        return;
      }
      payload.ocr = { page_ranges: `${s}-${e}` };
      payload.translation = { start_page: s, end_page: e };
    }
    await withBusy("translate", async () => {
      await actions.translateDocument(documentId, payload);
      dialogStore.close();
    }, "发起翻译失败");
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await withBusy("delete", async () => {
      await actions.deleteDocument(documentId);
      dialogStore.close();
    }, "删除失败");
  }

  const readerAvailable = `${item.status || ""}`.trim() === "succeeded";
  const canTranslate = libraryOnly || `${item.status || ""}`.trim() === "failed";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="desktop-dialog-overlay" />
        <DialogPrimitive.Content
          id="book-detail-dialog"
          className="desktop-dialog book-detail-dialog"
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <div className="desktop-shell">
            <div className="desktop-head">
              <DialogPrimitive.Title asChild>
                <h2>书籍详情</h2>
              </DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <button id="book-detail-close-btn" type="button" className="dialog-close-btn" aria-label="关闭">×</button>
              </DialogPrimitive.Close>
            </div>
            <div className="desktop-body book-detail-body">
              <div className="book-detail-top">
                <div
                  className={`book-detail-cover ${coverUrl ? "has-image" : ""}`.trim()}
                  style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}
                  aria-hidden="true"
                />
                <div className="book-detail-meta">
                  <span className={`book-detail-status is-${status.tone}`}>
                    {status.label}
                    {Number.isFinite(percent) ? ` · ${Math.round(percent)}%` : ""}
                  </span>
                  <label className="book-detail-field">
                    <span className="book-detail-field-label">标题</span>
                    <input
                      id="book-detail-title-input"
                      type="text"
                      value={titleText}
                      onChange={(event) => setTitleText(event.target.value)}
                    />
                  </label>
                  <div className="book-detail-facts">
                    {authors.length ? <span>{authors.join("、")}</span> : null}
                    {doc?.year ? <span>{doc.year}</span> : null}
                    <span>{pageCount || "-"} 页</span>
                    {formatBytes(doc?.bytes) ? <span>{formatBytes(doc.bytes)}</span> : null}
                    {formatDate(doc?.added_at) ? <span>入库 {formatDate(doc.added_at)}</span> : null}
                    {doc?.doi ? <span className="mono">{doc.doi}</span> : null}
                  </div>
                  <label className="book-detail-field">
                    <span className="book-detail-field-label">标签（逗号或顿号分隔）</span>
                    <input
                      id="book-detail-tags-input"
                      type="text"
                      value={tagsText}
                      onChange={(event) => setTagsText(event.target.value)}
                      placeholder="例如：化学、综述"
                    />
                  </label>
                  <div className="book-detail-reading">
                    <span className="book-detail-field-label">阅读状态</span>
                    <div className="book-detail-reading-seg" role="group" aria-label="阅读状态">
                      {READING_STATUSES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          className={`book-detail-reading-btn ${readingStatus === s.value ? "is-active" : ""}`.trim()}
                          disabled={busy === "reading"}
                          onClick={() => handleReadingStatus(s.value)}
                        >{s.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {translateOpen ? (
                <div className="book-detail-translate-range">
                  <span className="book-detail-field-label">页码范围（留空 = 整本）</span>
                  <div className="book-detail-range-inputs">
                    <input type="number" min="1" value={startPage} onChange={(e) => setStartPage(e.target.value)} aria-label="起始页" />
                    <span>–</span>
                    <input type="number" min="1" value={endPage} onChange={(e) => setEndPage(e.target.value)} aria-label="结束页" />
                  </div>
                </div>
              ) : null}

              {error ? <p className="book-detail-error">{error}</p> : null}
            </div>

            <div className="book-detail-actions">
              <div className="book-detail-actions-left">
                <Button
                  id="book-detail-delete-btn"
                  className={`app-button secondary danger${confirmingDelete ? " is-confirming" : ""}`}
                  disabled={Boolean(busy)}
                  onClick={handleDelete}
                >
                  {confirmingDelete ? "确认删除？" : "删除"}
                </Button>
                <Button
                  id="book-detail-save-btn"
                  className="app-button secondary"
                  disabled={Boolean(busy)}
                  onClick={handleSaveMeta}
                >
                  {busy === "meta" ? "保存中…" : "保存标题/标签"}
                </Button>
              </div>
              <div className="book-detail-actions-right">
                <Button
                  id="book-detail-read-source-btn"
                  className="app-button secondary"
                  disabled={Boolean(busy) || !documentId}
                  onClick={() => { actions.openSourceReader(documentId); dialogStore.close(); }}
                >
                  读原文
                </Button>
                {readerAvailable ? (
                  <Button
                    id="book-detail-compare-btn"
                    className="app-button"
                    disabled={Boolean(busy)}
                    onClick={() => { actions.openJobReader(jobId); dialogStore.close(); }}
                  >
                    对照阅读
                  </Button>
                ) : null}
                {canTranslate ? (
                  <>
                    <Button
                      id="book-detail-range-toggle-btn"
                      className="app-button secondary"
                      disabled={Boolean(busy)}
                      onClick={() => setTranslateOpen((v) => !v)}
                    >
                      {translateOpen ? "整本翻译" : "按页码"}
                    </Button>
                    <Button
                      id="book-detail-translate-btn"
                      className="app-button"
                      disabled={Boolean(busy)}
                      onClick={handleTranslate}
                    >
                      {busy === "translate" ? "提交中…" : "翻译"}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
