// 书籍详情弹窗(移植 PDF_MD_lib 的 BookDetailModal,按我们后端能力裁剪)。
//
// 两栏精致详情页,不是表单:左栏大封面 + 阅读动作,右栏标题(大标题,默认只读、
// 点"编辑"才改)/ 状态 / 阅读状态 / 标签 / 合集勾选 / 翻译工作台。
// 后端能力:PATCH /documents(title/reading_status/tags)、translate(可带页码
// 范围)、delete、collections 加入/移出。作者/年份/DOI 后端不可改,只读展示。

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
  return n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
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

  // 编辑态:标题/标签默认只读,点"编辑"进入
  const [editing, setEditing] = useState(false);
  const [titleText, setTitleText] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [tags, setTags] = useState([]);

  // 翻译区:页码范围(默认整本)
  const [rangeOn, setRangeOn] = useState(false);
  const [startPage, setStartPage] = useState("1");
  const [endPage, setEndPage] = useState("");

  // 合集勾选
  const [collections, setCollections] = useState([]);
  const [collectionsBusy, setCollectionsBusy] = useState("");

  useEffect(() => {
    if (!open || !documentId) {
      setDoc(null);
      setError("");
      setConfirmingDelete(false);
      setEditing(false);
      setRangeOn(false);
      setBusy("");
      setCollections([]);
      return undefined;
    }
    let cancelled = false;
    const title = item.title || item.display_name || "";
    const initialTags = Array.isArray(item.tags) ? item.tags : [];
    setReadingStatus(item.reading_status || "unread");
    setTitleText(title);
    setTags(initialTags);
    setTagsText(initialTags.join("、"));

    fetchDocument(API_PREFIX, documentId)
      .then((full) => {
        if (cancelled) {
          return;
        }
        setDoc(full);
        setReadingStatus(full.reading_status || "unread");
        setTitleText(full.title || full.source_filename || "");
        const fullTags = Array.isArray(full.tags) ? full.tags : [];
        setTags(fullTags);
        setTagsText(fullTags.join("、"));
        setEndPage(`${full.page_count || ""}`);
      })
      .catch(() => {});

    // 合集成员关系:列出全部分类,逐个查该文档是否在其中(FolderPicker 同款)
    if (collectionsCtl) {
      collectionsCtl.listCollections()
        .then(async (list) => {
          const rows = Array.isArray(list?.collections)
            ? list.collections
            : (Array.isArray(list) ? list : []);
          const withMembership = await Promise.all(rows.map(async (col) => {
            let member = false;
            try {
              const ids = await collectionsCtl.listCollectionDocumentIds(col.collection_id);
              member = ids.includes(documentId);
            } catch {
              member = false;
            }
            return { collection_id: col.collection_id, name: col.name, member };
          }));
          if (!cancelled) {
            setCollections(withMembership);
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentId]);

  const authors = useMemo(() => parseAuthors(doc?.authors_json), [doc?.authors_json]);
  const pageCount = doc?.page_count || item.page_count || 0;
  const percent = isRecentJobActive(item) ? recentJobProgressPercent(item) : NaN;
  const readerAvailable = `${item.status || ""}`.trim() === "succeeded";
  const canTranslate = libraryOnly || `${item.status || ""}`.trim() === "failed";
  const isActive = isRecentJobActive(item);

  function close() {
    dialogStore.close();
  }

  function handleOpenChange(nextOpen) {
    if (!nextOpen) {
      close();
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
    if (value === readingStatus || busy) {
      return;
    }
    const previous = readingStatus;
    setReadingStatus(value);
    await withBusy("reading", async () => {
      await actions.updateDocument(documentId, { reading_status: value });
    }, "更新阅读状态失败").catch(() => setReadingStatus(previous));
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
      const updated = await actions.updateDocument(documentId, {
        title: nextTitle || undefined,
        tags: nextTags,
      });
      if (updated) {
        setDoc(updated);
      }
      setTags(nextTags);
      setEditing(false);
    }, "保存失败");
  }

  async function handleTranslate() {
    const payload = {};
    if (rangeOn) {
      const s = Number(startPage);
      const e = Number(endPage);
      if (!Number.isInteger(s) || !Number.isInteger(e) || s < 1 || e < s || (pageCount && e > pageCount)) {
        setError(`页码范围不合法（1–${pageCount || "总页数"}）`);
        return;
      }
      payload.ocr = { page_ranges: `${s}-${e}` };
      payload.translation = { start_page: s, end_page: e };
    }
    await withBusy("translate", async () => {
      await actions.translateDocument(documentId, payload);
      close();
    }, "发起翻译失败");
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await withBusy("delete", async () => {
      await actions.deleteDocument(documentId);
      close();
    }, "删除失败");
  }

  async function toggleCollection(collectionId, nextMember) {
    if (!collectionsCtl || collectionsBusy) {
      return;
    }
    setCollectionsBusy(collectionId);
    setError("");
    try {
      if (nextMember) {
        await collectionsCtl.addDocuments(collectionId, [documentId]);
      } else {
        await collectionsCtl.removeDocument(collectionId, documentId);
      }
      setCollections((prev) => prev.map((c) => (
        c.collection_id === collectionId ? { ...c, member: nextMember } : c
      )));
      collectionsReload?.actions.bump();
    } catch (err) {
      setError(err?.message || "更新合集失败");
    } finally {
      setCollectionsBusy("");
    }
  }

  const facts = [
    pageCount ? `${pageCount} 页` : "",
    formatBytes(doc?.bytes),
    formatDate(doc?.added_at) ? `入库 ${formatDate(doc.added_at)}` : "",
  ].filter(Boolean);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="desktop-dialog-overlay" />
        <DialogPrimitive.Content
          id="book-detail-dialog"
          className="desktop-dialog book-detail-dialog"
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <div className="book-detail-shell">
            <DialogPrimitive.Close asChild>
              <button id="book-detail-close-btn" type="button" className="dialog-close-btn book-detail-close" aria-label="关闭">×</button>
            </DialogPrimitive.Close>
            <DialogPrimitive.Title asChild>
              <h2 className="sr-only">书籍详情</h2>
            </DialogPrimitive.Title>

            <div className="book-detail-grid">
              {/* ── 左栏:封面 + 阅读动作 ── */}
              <div className="book-detail-left">
                <div
                  className={`book-detail-cover ${coverUrl ? "has-image" : ""}`.trim()}
                  style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}
                  aria-hidden="true"
                >
                  {coverUrl ? null : <span className="book-detail-cover-empty">无封面</span>}
                </div>
                <div className="book-detail-read-actions">
                  {readerAvailable ? (
                    <Button
                      id="book-detail-compare-btn"
                      className="app-button book-detail-block-btn"
                      disabled={Boolean(busy)}
                      onClick={() => { actions.openJobReader(jobId); close(); }}
                    >
                      对照阅读
                    </Button>
                  ) : null}
                  <Button
                    id="book-detail-read-source-btn"
                    className="app-button secondary book-detail-block-btn"
                    disabled={Boolean(busy) || !documentId}
                    onClick={() => { actions.openSourceReader(documentId); close(); }}
                  >
                    读原文
                  </Button>
                </div>
              </div>

              {/* ── 右栏:元数据 + 编辑 + 状态 + 合集 + 翻译 ── */}
              <div className="book-detail-right">
                <span className={`book-detail-status is-${status.tone}`}>
                  {status.label}
                  {Number.isFinite(percent) ? ` · ${Math.round(percent)}%` : ""}
                </span>

                {editing ? (
                  <div className="book-detail-edit">
                    <label className="book-detail-field">
                      <span className="book-detail-field-label">标题</span>
                      <input
                        id="book-detail-title-input"
                        type="text"
                        value={titleText}
                        onChange={(e) => setTitleText(e.target.value)}
                        autoFocus
                      />
                    </label>
                    <label className="book-detail-field">
                      <span className="book-detail-field-label">标签（逗号或顿号分隔）</span>
                      <input
                        id="book-detail-tags-input"
                        type="text"
                        value={tagsText}
                        onChange={(e) => setTagsText(e.target.value)}
                        placeholder="例如：化学、综述"
                      />
                    </label>
                    <div className="book-detail-edit-actions">
                      <Button className="app-button secondary" disabled={busy === "meta"} onClick={() => setEditing(false)}>取消</Button>
                      <Button id="book-detail-save-btn" className="app-button" disabled={busy === "meta"} onClick={handleSaveEdit}>
                        {busy === "meta" ? "保存中…" : "保存"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="book-detail-headline">
                    <div className="book-detail-headline-main">
                      <h1 className="book-detail-title" title={doc?.title || titleText}>{doc?.title || titleText || "-"}</h1>
                      <p className="book-detail-sub">
                        {authors.length ? authors.join("、") : "未知作者"}
                        {doc?.year ? ` · ${doc.year}` : ""}
                        {doc?.doi ? ` · ${doc.doi}` : ""}
                      </p>
                    </div>
                    <button id="book-detail-edit-btn" type="button" className="book-detail-edit-btn" onClick={startEdit}>编辑</button>
                  </div>
                )}

                {facts.length ? <p className="book-detail-facts">{facts.join(" · ")}</p> : null}

                {tags.length && !editing ? (
                  <div className="book-detail-tags">
                    {tags.map((t) => <span key={t} className="book-detail-tag">{t}</span>)}
                  </div>
                ) : null}

                <div className="book-detail-section">
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

                {collections.length ? (
                  <div className="book-detail-section">
                    <span className="book-detail-field-label">合集</span>
                    <div className="book-detail-collections">
                      {collections.map((c) => (
                        <button
                          key={c.collection_id}
                          type="button"
                          className={`book-detail-collection-chip ${c.member ? "is-member" : ""}`.trim()}
                          disabled={collectionsBusy === c.collection_id}
                          onClick={() => toggleCollection(c.collection_id, !c.member)}
                        >
                          {c.member ? "✓ " : "+ "}{c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* ── 翻译工作台 ── */}
                <div className="book-detail-section book-detail-translate">
                  <span className="book-detail-field-label">翻译</span>
                  {isActive ? (
                    <div className="book-detail-translate-progress">
                      <div className="book-detail-progress-track">
                        <span className="book-detail-progress-bar" style={{ width: `${Number.isFinite(percent) ? percent : 0}%` }} />
                      </div>
                      <span className="book-detail-progress-label">{recentJobStageLabel(item)}{Number.isFinite(percent) ? ` · ${Math.round(percent)}%` : ""}</span>
                    </div>
                  ) : readerAvailable ? (
                    <p className="book-detail-translate-done">已翻译完成，可在左侧「对照阅读」查看。</p>
                  ) : canTranslate ? (
                    <div className="book-detail-translate-work">
                      <label className="book-detail-range-toggle">
                        <input type="checkbox" checked={rangeOn} onChange={(e) => setRangeOn(e.target.checked)} />
                        <span>指定页码范围（不勾选 = 整本翻译）</span>
                      </label>
                      {rangeOn ? (
                        <div className="book-detail-range-inputs">
                          <input type="number" min="1" value={startPage} onChange={(e) => setStartPage(e.target.value)} aria-label="起始页" />
                          <span>–</span>
                          <input type="number" min="1" value={endPage} onChange={(e) => setEndPage(e.target.value)} aria-label="结束页" />
                          <span className="book-detail-range-hint">共 {pageCount || "?"} 页</span>
                        </div>
                      ) : null}
                      <Button id="book-detail-translate-btn" className="app-button" disabled={Boolean(busy)} onClick={handleTranslate}>
                        {busy === "translate" ? "提交中…" : (rangeOn ? "翻译选定页码" : "翻译整本")}
                      </Button>
                    </div>
                  ) : (
                    <p className="book-detail-translate-done">当前状态暂不可发起翻译。</p>
                  )}
                </div>

                {error ? <p className="book-detail-error">{error}</p> : null}

                <div className="book-detail-footer">
                  <button
                    id="book-detail-delete-btn"
                    type="button"
                    className={`book-detail-delete-btn ${confirmingDelete ? "is-confirming" : ""}`.trim()}
                    disabled={Boolean(busy)}
                    onClick={handleDelete}
                  >
                    {confirmingDelete ? "确认删除这本书？" : "删除"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
