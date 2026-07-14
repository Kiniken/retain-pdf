// 文档中心网格的分页数据源(计划 F2)。返回形状与
// recent-jobs/pagination.js#collectRecentJobsPage 对齐
// ({ collected, hasMore, latestInvocationSummary, nextOffset }),这样
// recent-jobs 的 loader.js/commit.js/store 引擎可以一行不改地消费它。
//
// 每篇文档产出一张卡:先拉一页 /documents,收集该页 active_job_id,批量向
// library/books?job_ids= 取这些 job 的实时活态,再按 job_id 合并
// (shapeDocumentCardItem)。馆藏文档(无 active_job_id)拿合成 job_id 穿过引擎。
//
// 搜索:/documents 目前没有服务端文本搜索(仅 reading_status/tag/collection 过滤),
// 这里 query 走**客户端标题/文件名过滤**;有 query 时一次多拉一批再过滤、并关掉
// 继续分页。文档级服务端全文/标题搜索是后端待补项(见 memory
// f2-document-centric-grid-design)。

import { shapeDocumentCardItem } from "./document-card-item.js";

const SEARCH_FETCH_LIMIT = 200;

function normalizedJobId(value) {
  return `${value || ""}`.trim();
}

export async function collectDocumentLibraryPage({
  fetchDocumentList,
  fetchLibraryBookList,
  apiPrefix,
  startOffset = 0,
  pageSize,
  existingJobIds = new Set(),
  query = "",
}) {
  const trimmedQuery = `${query || ""}`.trim().toLowerCase();
  const searching = trimmedQuery.length > 0;
  const seen = existingJobIds instanceof Set
    ? new Set(existingJobIds)
    : new Set((Array.isArray(existingJobIds) ? existingJobIds : []).map(normalizedJobId).filter(Boolean));

  const limit = searching ? Math.max(pageSize, SEARCH_FETCH_LIMIT) : pageSize;
  const offset = searching ? 0 : startOffset;

  const payload = await fetchDocumentList(apiPrefix, { limit, offset });
  const documents = Array.isArray(payload?.documents) ? payload.documents : [];
  const total = Number.isFinite(Number(payload?.total)) ? Number(payload.total) : documents.length;

  // 批量取该页已翻译文档的 library/books 活态(实时 status/progress/cover)。
  const jobIds = documents
    .map((doc) => normalizedJobId(doc?.active_job_id))
    .filter(Boolean);
  const bookMap = new Map();
  if (jobIds.length && typeof fetchLibraryBookList === "function") {
    const bookPayload = await fetchLibraryBookList(apiPrefix, { jobIds, limit: jobIds.length });
    for (const book of (Array.isArray(bookPayload?.items) ? bookPayload.items : [])) {
      const id = normalizedJobId(book?.job_id);
      if (id) {
        bookMap.set(id, book);
      }
    }
  }

  const collected = [];
  for (const doc of documents) {
    const activeJobId = normalizedJobId(doc?.active_job_id);
    const item = shapeDocumentCardItem(doc, activeJobId ? bookMap.get(activeJobId) || null : null);
    const key = normalizedJobId(item.job_id);
    if (!key || seen.has(key)) {
      continue;
    }
    if (searching) {
      const haystack = `${item.title || ""} ${item.display_name || ""} ${item.source_file_name || ""}`.toLowerCase();
      if (!haystack.includes(trimmedQuery)) {
        continue;
      }
    }
    seen.add(key);
    collected.push(item);
  }

  const hasMore = searching
    ? false
    : documents.length > 0 && offset + documents.length < total;
  const nextOffset = searching ? startOffset : startOffset + pageSize;

  return {
    collected,
    hasMore,
    latestInvocationSummary: null,
    nextOffset,
  };
}
