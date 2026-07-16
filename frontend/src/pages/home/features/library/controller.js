// 图书馆(文档)域的动作集合 —— 从 composition.js 抽出来的(重构①)。
//
// 之前这 9 个文档动作(读原文/只入库/翻译/删除/批量删除/卡片删除/开详情/改
// 元数据)以内联 function 的形式塞在 composition.js 装配根里,让那个文件长到
// 1200 行、混了装配和业务。现在照 collections/controller.js 的样式,收成一层
// 绑好依赖的薄函数集合;composition.js 只负责 new 一次 + 把返回值接进
// services.library.actions,回归纯 wiring。
//
// 依赖经参数注入(不直接 import composition 作用域的东西):
// - documentRef:派发 APP_EVENTS 用的事件目标(node 测试环境无 CustomEvent,
//   dispatchAppEvent 里有守卫)。
// - libraryEventPort:上传后"只入库"刷新网格。
// - recentJobsViewPort:失败时在网格上渲染错误条(renderError)。
// - reloadRecentJobs:整页重载网格。composition 传的是读 features.recentJobsFeature
//   的闭包——features 是可变对象、后填,必须调用时再取,不能在这里提前捕获。
// - deleteJob:极少见的运行时 job-only 项(无 document_id)退回老的 job 删除。
//
// bookDetailStore 由本 controller 拥有并暴露,composition 的 services.bookDetail
// 也复用同一个实例。

import { translateDocument, deleteDocument, patchDocument } from "../../../../js/api/documents.js";
import { API_PREFIX } from "../../../../js/config/api-constants.js";
import { APP_EVENTS } from "../../../../js/contracts/app-contract.js";
import { createBookDetailDialogStore } from "./book-detail-dialog-store.js";

export function createLibraryController({
  documentRef,
  libraryEventPort,
  recentJobsViewPort,
  reloadRecentJobs,
  deleteJob,
} = {}) {
  const bookDetailStore = createBookDetailDialogStore();
  const translatingDocumentIds = new Set();

  function dispatchAppEvent(name, detail) {
    if (documentRef?.dispatchEvent && typeof globalThis.CustomEvent === "function") {
      documentRef.dispatchEvent(
        new globalThis.CustomEvent(name, detail === undefined ? undefined : { detail }),
      );
    }
  }

  async function reload(opts) {
    await reloadRecentJobs?.(opts);
  }

  // F4 馆藏文档"读原文":无 job,派发带 documentId 的 openReaderRequested,
  // ReaderDialog 用 document_id 打开只读源文档阅读器(与卡片对照阅读同一事件契约)。
  function openSourceReader(documentId) {
    const normalizedId = `${documentId || ""}`.trim();
    if (!normalizedId) {
      return;
    }
    dispatchAppEvent(APP_EVENTS.openReaderRequested, { documentId: normalizedId, pageIdx: null, blockId: "" });
  }

  // F3 "只入库,不翻译":PDF 在**上传完成那一刻**后端就已经建好 document 了
  // (POST /uploads → upsert_document_from_upload,document_id = 内容哈希),
  // 所以"只入库"不需要任何新接口——就是**不提交翻译 job**:关掉工作流对话框
  // (其 close() 顺带 resetUploadSession)+ 刷新网格,新文档以馆藏态出现。
  function storeUploadedDocumentOnly() {
    dispatchAppEvent(APP_EVENTS.closeTranslationWorkflow);
    libraryEventPort.requestRefresh({ force: true, delay: 0 });
  }

  // F5 馆藏文档"以后再翻":复用文档已存的 upload 起 book 翻译 job,后端回填
  // active_job_id;随后整页重载一次——该文档会以真实 job_id 重新进网格,现有
  // 轮询引擎(active-refresh 按 job_id 拉 job payload)自然接管进度。
  async function translateLibraryDocument(documentId, payload = {}) {
    const normalizedId = `${documentId || ""}`.trim();
    if (!normalizedId || translatingDocumentIds.has(normalizedId)) {
      return;
    }
    translatingDocumentIds.add(normalizedId);
    try {
      await translateDocument(API_PREFIX, normalizedId, payload);
    } catch (error) {
      recentJobsViewPort.renderError(`${error?.message || "发起翻译失败，请稍后重试。"}`, { reset: false });
      return;
    } finally {
      translatingDocumentIds.delete(normalizedId);
    }
    await reload({ reset: true });
  }

  // 文档级删除(后端补了 DELETE /documents/:id 之后):删掉 document + 名下所有
  // job/upload/文件。馆藏文档和已翻译文档统一走这条(卡片都带 document_id)。
  function friendlyDocumentDeleteError(error) {
    const message = `${error?.message || error || ""}`;
    if (error?.status === 409 || message.includes("(409)")) {
      const count = message.match(/\d+/)?.[0];
      return count
        ? `该文档有 ${count} 条收藏，请先删除收藏后再删除文档。`
        : "该文档存在收藏引用，请先删除相关收藏后再删除文档。";
    }
    return message || "删除文档失败";
  }

  async function deleteLibraryDocument(documentId) {
    const normalizedId = `${documentId || ""}`.trim();
    if (!normalizedId) {
      return;
    }
    try {
      await deleteDocument(API_PREFIX, normalizedId);
    } catch (error) {
      recentJobsViewPort.renderError(friendlyDocumentDeleteError(error), { reset: false });
      return;
    }
    await reload({ reset: true });
  }

  // 批量删除(#31 批量选择工具栏):后端没有批量删除端点,逐个复用单篇
  // deleteDocument,Promise.allSettled 容忍部分失败;成功/失败计数交回调用方
  // (toast 提示),这里只负责执行 + 最后统一 reload 一次(不像单篇删除那样
  // 每次都 reload——N 篇顺序 reload 没有意义还浪费请求)。
  async function deleteLibraryDocuments(documentIds = []) {
    const ids = [...new Set((documentIds || []).map((id) => `${id || ""}`.trim()).filter(Boolean))];
    if (!ids.length) {
      return { confirmed: 0, failed: 0 };
    }
    const results = await Promise.allSettled(ids.map((id) => deleteDocument(API_PREFIX, id)));
    const confirmed = results.filter((r) => r.status === "fulfilled").length;
    await reload({ reset: true });
    return { confirmed, failed: results.length - confirmed };
  }

  // 卡片删除入口:有 document_id 走文档级删除(删整篇文档 + 名下所有 job);
  // 没有(极少见的运行时插入 job 项)退回老的 job 删除,保留原行为。
  function deleteCard(target = {}) {
    const documentId = `${target?.documentId || ""}`.trim();
    if (documentId) {
      void deleteLibraryDocument(documentId);
      return;
    }
    deleteJob?.(`${target?.jobId || ""}`.trim());
  }

  // 书籍详情弹窗:点卡片打开(BookDetailDialog 消费 payload=卡片 item)。
  function openBookDetail(item) {
    if (`${item?.document_id || ""}`.trim()) {
      bookDetailStore.open(item);
    }
  }

  // 详情弹窗里改标题/标签/阅读状态:PATCH /documents/:id + 静默整页重载(书架
  // 卡片跟着更新),返回更新后的文档给弹窗即时刷新。
  async function updateLibraryDocument(documentId, payload = {}) {
    const normalizedId = `${documentId || ""}`.trim();
    if (!normalizedId) {
      return null;
    }
    const updated = await patchDocument(API_PREFIX, normalizedId, payload);
    await reload({ reset: true, silent: true });
    return updated;
  }

  return {
    bookDetailStore,
    // 键名对齐 services.library.actions 的既有契约(消费方 RecentJobsLibrary /
    // BookDetailDialog / CategoriesView 不用改)。
    openSourceReader,
    storeOnly: storeUploadedDocumentOnly,
    translateDocument: translateLibraryDocument,
    deleteDocument: deleteLibraryDocument,
    deleteDocuments: deleteLibraryDocuments,
    deleteCard,
    openBookDetail,
    updateDocument: updateLibraryDocument,
  };
}
