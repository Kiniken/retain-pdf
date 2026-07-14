import { MOCK_JOB_ID } from "./constants.js";

export const MOCK_DOCUMENT_ID = "doc-9f2a41c8e77b";

// 与后端 documents 数据层形状一致(见后端对接说明):
// document = 按内容哈希去重的稳定身份,job 是文档名下的处理记录
function buildMockDocuments() {
  return [
    {
      document_id: MOCK_DOCUMENT_ID,
      title: "共轭在卤素-锂交换选择性中的作用",
      source_filename: "halogen-lithium-exchange.pdf",
      page_count: 10,
      bytes: 2_621_440,
      active_job_id: MOCK_JOB_ID,
      reading_status: "reading",
      tags: ["化学", "有机合成"],
      added_at: "2026-06-01T10:00:00Z",
      updated_at: "2026-06-01T12:00:00Z",
    },
    {
      document_id: "doc-1b8c52d9a304",
      title: "Attention Is All You Need",
      source_filename: "attention.pdf",
      page_count: 15,
      bytes: 1_843_200,
      active_job_id: "20260520-att-001",
      reading_status: "done",
      tags: ["机器学习"],
      added_at: "2026-05-20T08:00:00Z",
      updated_at: "2026-05-21T09:30:00Z",
    },
    {
      document_id: "doc-77e0fa3c1d55",
      title: "Scaling Laws for Neural Language Models",
      source_filename: "scaling-laws.pdf",
      page_count: 30,
      bytes: 4_115_000,
      active_job_id: "20260601-scl-002",
      reading_status: "unread",
      tags: [],
      added_at: "2026-06-08T14:00:00Z",
      updated_at: "2026-06-08T14:00:00Z",
    },
    // 馆藏态(只入库、未翻译):active_job_id 为空。文档中心网格要能显示它们,
    // 阅读器要能只读原文,卡片要能"以后再翻"。
    {
      document_id: "doc-ref-6a1f2c",
      title: "Reaxys Retrosynthesis 手册(仅馆藏)",
      source_filename: "reaxys-handbook.pdf",
      page_count: 42,
      bytes: 3_200_000,
      active_job_id: null,
      reading_status: "unread",
      tags: ["工具书"],
      added_at: "2026-06-10T09:00:00Z",
      updated_at: "2026-06-10T09:00:00Z",
    },
    {
      document_id: "doc-ref-9b7e04",
      title: "Group Theory Lecture Notes(仅馆藏)",
      source_filename: "group-theory-notes.pdf",
      page_count: 88,
      bytes: 5_600_000,
      active_job_id: "",
      reading_status: "reading",
      tags: [],
      added_at: "2026-06-12T15:30:00Z",
      updated_at: "2026-06-12T15:30:00Z",
    },
  ];
}

// 镜像后端 with_document_media_urls:列表/详情由 API 层给每篇文档填三个媒体
// URL(不入库)。cover/thumbnail 用真实形状的 /api/v1/documents/:id/... 路径
// (mock 模式下这两个图片 fetch 会失败 → useRecentJobCover 兜底成占位图标,
// 和现有 mock 卡片行为一致);source_pdf_url 用 mock:// 通道,好让"只读原文"
// 阅读器在 ?mock= 下也能真的渲染出源 PDF(见 mock/responses.js)。
export const MOCK_DOCUMENT_SOURCE_PDF_URL = "mock://document-source.pdf";

function withMockDocumentMediaUrls(document) {
  const base = `/api/v1/documents/${encodeURIComponent(document.document_id)}`;
  return {
    ...document,
    source_pdf_url: MOCK_DOCUMENT_SOURCE_PDF_URL,
    cover_url: `${base}/cover`,
    thumbnail_url: `${base}/thumbnail`,
  };
}

let mockDocuments = null;

function documents() {
  if (!mockDocuments) {
    mockDocuments = buildMockDocuments();
  }
  return mockDocuments;
}

export function getMockDocumentList({
  limit = 50,
  offset = 0,
  readingStatus = "",
  tag = "",
  collectionId = "",
} = {}) {
  let list = documents();
  if (`${readingStatus}`.trim()) {
    list = list.filter((item) => item.reading_status === `${readingStatus}`.trim());
  }
  if (`${tag}`.trim()) {
    list = list.filter((item) => item.tags.includes(`${tag}`.trim()));
  }
  if (`${collectionId}`.trim()) {
    const memberIds = collectionMembership(`${collectionId}`.trim());
    list = list.filter((item) => memberIds.has(item.document_id));
  }
  return {
    documents: list.slice(offset, offset + limit).map(withMockDocumentMediaUrls),
    total: list.length,
    limit,
    offset,
  };
}

export function getMockDocument(documentId) {
  const found = documents().find((item) => item.document_id === documentId);
  if (!found) {
    throw new Error("未找到该文档。(404)");
  }
  return withMockDocumentMediaUrls(found);
}

// 后端按 job_id 直查所属文档:active_job_id 命中当然算,
// 历史 run(同一文档的旧翻译记录)也应解析到同一文档——用一张历史映射证明这条路可用。
const MOCK_HISTORICAL_JOB_TO_DOCUMENT = {
  "mock-job-20260101-old": MOCK_DOCUMENT_ID,
};

export function getMockDocumentByJobId(jobId) {
  const normalized = `${jobId || ""}`.trim();
  if (!normalized) {
    return null;
  }
  const byActive = documents().find((item) => item.active_job_id === normalized);
  if (byActive) {
    return withMockDocumentMediaUrls(byActive);
  }
  const historicalDocId = MOCK_HISTORICAL_JOB_TO_DOCUMENT[normalized];
  if (historicalDocId) {
    const doc = documents().find((item) => item.document_id === historicalDocId);
    return doc ? withMockDocumentMediaUrls(doc) : null;
  }
  return null;
}

const READING_STATUSES = ["unread", "reading", "done"];

export function patchMockDocument(documentId, { title, reading_status: readingStatus, tags } = {}) {
  const found = documents().find((item) => item.document_id === documentId);
  if (!found) {
    throw new Error("未找到该文档。(404)");
  }
  if (readingStatus !== undefined && !READING_STATUSES.includes(readingStatus)) {
    throw new Error("reading_status 仅支持 unread | reading | done。(400)");
  }
  if (title !== undefined) {
    found.title = `${title}`;
  }
  if (readingStatus !== undefined) {
    found.reading_status = readingStatus;
  }
  if (tags !== undefined) {
    // 整体替换语义
    found.tags = Array.isArray(tags) ? tags.map((item) => `${item}`) : [];
  }
  found.updated_at = new Date().toISOString();
  return withMockDocumentMediaUrls(found);
}

// mock 版 POST /documents/:id/translate:给馆藏文档挂一个 mock active_job_id,
// 让 F2 的进度轮询把这条卡片从"馆藏"接管进"翻译中"。返回 JobSubmissionView 形状
// (与后端 translate_document_view 一致:job_id + status + document_id)。
export function translateMockDocument(documentId) {
  const found = documents().find((item) => item.document_id === documentId);
  if (!found) {
    throw new Error("未找到该文档。(404)");
  }
  if (`${found.active_job_id || ""}`.trim()) {
    throw new Error("该文档已在翻译流程中。(409)");
  }
  const jobId = `mock-translate-${found.document_id}`;
  found.active_job_id = jobId;
  found.updated_at = new Date().toISOString();
  return {
    job_id: jobId,
    document_id: found.document_id,
    status: "queued",
  };
}

// ===== 分类(合集):建文件夹给 PDF 分组 =====
// 与 js/api/collections.js 同构(collection_id/name/parent_id/sort_order/
// created_at/document_count);membership 单独存一张 collection_id → Set<document_id>
// 表,和真实后端 collection_documents 表同样的建模方式。

let mockCollections = null;
let mockCollectionMembership = null;
let collectionSeq = 0;

function seedMockCollections() {
  collectionSeq = 2;
  mockCollections = [
    { collection_id: "col-001", name: "化学", parent_id: null, sort_order: 0, created_at: "2026-06-01T10:30:00Z" },
    { collection_id: "col-002", name: "机器学习", parent_id: null, sort_order: 1, created_at: "2026-06-08T15:00:00Z" },
  ];
  // mock 的"最近任务"列表(js/mock/index.js#getMockJobList)目前只有 MOCK_JOB_ID
  // 这一条真实数据,doc-1b8c52d9a304/doc-77e0fa3c1d55 的 active_job_id 在
  // job 列表里查不到——"机器学习"文件夹留空,顺便覆盖"空文件夹"这个真实 UI 态。
  mockCollectionMembership = new Map([
    ["col-001", new Set([MOCK_DOCUMENT_ID])],
    ["col-002", new Set()],
  ]);
}

function collectionsList() {
  if (!mockCollections) {
    seedMockCollections();
  }
  return mockCollections;
}

function collectionMembership(collectionId) {
  if (!mockCollectionMembership) {
    seedMockCollections();
  }
  if (!mockCollectionMembership.has(collectionId)) {
    mockCollectionMembership.set(collectionId, new Set());
  }
  return mockCollectionMembership.get(collectionId);
}

function collectionWithCount(record) {
  return { ...record, document_count: collectionMembership(record.collection_id).size };
}

export function getMockCollectionList() {
  const list = [...collectionsList()].sort((a, b) => a.sort_order - b.sort_order);
  return { collections: list.map(collectionWithCount) };
}

export function createMockCollection({ name, parent_id: parentId = null } = {}) {
  const trimmed = `${name || ""}`.trim();
  if (!trimmed) {
    throw new Error("name must not be empty. (400)");
  }
  collectionsList(); // 确保种子数据与 collectionSeq 初始化
  collectionSeq += 1;
  const record = {
    collection_id: `col-${String(collectionSeq).padStart(3, "0")}`,
    name: trimmed,
    parent_id: parentId || null,
    sort_order: collectionsList().length,
    created_at: new Date().toISOString(),
  };
  collectionsList().push(record);
  return collectionWithCount(record);
}

export function patchMockCollection(collectionId, { name, sort_order: sortOrder } = {}) {
  const found = collectionsList().find((item) => item.collection_id === collectionId);
  if (!found) {
    throw new Error("未找到该分类。(404)");
  }
  if (name !== undefined) {
    const trimmed = `${name}`.trim();
    if (!trimmed) {
      throw new Error("name must not be empty. (400)");
    }
    found.name = trimmed;
  }
  if (sortOrder !== undefined) {
    found.sort_order = Number(sortOrder) || 0;
  }
  return collectionWithCount(found);
}

export function deleteMockCollection(collectionId) {
  const list = collectionsList();
  const index = list.findIndex((item) => item.collection_id === collectionId);
  if (index < 0) {
    throw new Error("未找到该分类。(404)");
  }
  list.splice(index, 1);
  if (mockCollectionMembership) {
    mockCollectionMembership.delete(collectionId);
  }
  return { deleted: true };
}

export function addMockCollectionDocuments(collectionId, documentIds = []) {
  const found = collectionsList().find((item) => item.collection_id === collectionId);
  if (!found) {
    throw new Error("未找到该分类。(404)");
  }
  const members = collectionMembership(collectionId);
  for (const documentId of documentIds) {
    const normalized = `${documentId || ""}`.trim();
    if (!normalized) {
      continue;
    }
    if (!documents().some((item) => item.document_id === normalized)) {
      throw new Error(`未找到该文档: ${normalized}(404)`);
    }
    members.add(normalized);
  }
  return collectionWithCount(found);
}

export function removeMockCollectionDocument(collectionId, documentId) {
  const members = collectionMembership(collectionId);
  const normalized = `${documentId || ""}`.trim();
  if (!members.has(normalized)) {
    throw new Error("该文档不在此分类中。(404)");
  }
  members.delete(normalized);
  return { removed: true };
}

// ===== 收藏 =====

let mockFavorites = null;
let favoriteSeq = 0;

function favorites() {
  if (!mockFavorites) {
    favoriteSeq = 2;
    mockFavorites = [
      {
        favorite_id: "fav-001",
        document_id: MOCK_DOCUMENT_ID,
        job_id: MOCK_JOB_ID,
        page_idx: 0,
        block_id: "b-intro-3",
        kind: "sentence",
        quote_text: "现代有机合成已达到极高的精密水平。",
        translated_quote_text: "",
        note: "",
        created_at: "2026-06-01T11:00:00Z",
      },
      {
        favorite_id: "fav-002",
        document_id: MOCK_DOCUMENT_ID,
        job_id: MOCK_JOB_ID,
        page_idx: 2,
        block_id: "b-scheme-1b",
        kind: "figure",
        quote_text: "Scheme 1b",
        translated_quote_text: "",
        note: "萘系刚性对位阻的影响",
        created_at: "2026-06-01T11:20:00Z",
      },
    ];
  }
  return mockFavorites;
}

export function createMockFavorite(payload = {}) {
  const quoteText = `${payload.quote_text || ""}`.trim();
  const jobId = `${payload.job_id || ""}`.trim();
  // document_id 可缺省:给了 job_id 时后端解析所属文档(含历史 run)。二者至少有一。
  const doc = `${payload.document_id || ""}`.trim()
    ? documents().find((item) => item.document_id === `${payload.document_id}`.trim())
    : (jobId ? getMockDocumentByJobId(jobId) : null);
  if (!doc || payload.page_idx === undefined || !payload.block_id || !quoteText) {
    throw new Error("document_id 或 job_id、page_idx、block_id、quote_text 为必填。(400)");
  }
  favorites(); // 先确保种子数据与 favoriteSeq 初始化,再分配新 id
  favoriteSeq += 1;
  const favorite = {
    favorite_id: `fav-${String(favoriteSeq).padStart(3, "0")}`,
    document_id: doc.document_id,
    // job_id 不传时锚定文档的 active_job_id
    job_id: jobId || doc.active_job_id || "",
    page_idx: Number(payload.page_idx) || 0,
    block_id: `${payload.block_id}`,
    kind: ["sentence", "data", "figure"].includes(payload.kind) ? payload.kind : "sentence",
    quote_text: quoteText,
    translated_quote_text: `${payload.translated_quote_text || ""}`,
    note: `${payload.note || ""}`,
    char_start: payload.char_start,
    char_end: payload.char_end,
    created_at: new Date().toISOString(),
  };
  favorites().push(favorite);
  return { ...favorite };
}

export function getMockFavorites({ documentId = "" } = {}) {
  const normalized = `${documentId || ""}`.trim();
  const list = normalized
    ? favorites().filter((item) => item.document_id === normalized)
        .sort((a, b) => a.page_idx - b.page_idx)
    : [...favorites()].sort((a, b) => `${b.created_at}`.localeCompare(`${a.created_at}`));
  return { favorites: list.map((item) => ({ ...item })) };
}

export function deleteMockFavorite(favoriteId) {
  const list = favorites();
  const index = list.findIndex((item) => item.favorite_id === favoriteId);
  if (index < 0) {
    throw new Error("未找到该收藏。(404)");
  }
  list.splice(index, 1);
  return { favorite_id: favoriteId };
}

export function countMockFavoritesByJob(jobId) {
  return favorites().filter((item) => item.job_id === `${jobId || ""}`.trim()).length;
}

// ===== 全文检索 =====

export function getMockSearchHits(q = "", { limit = 20 } = {}) {
  const query = `${q || ""}`.trim();
  if (!query) {
    return { hits: [] };
  }
  const hits = [
    {
      document_id: MOCK_DOCUMENT_ID,
      job_id: MOCK_JOB_ID,
      page_idx: 0,
      block_id: "b-intro-3",
      source_snippet: `…the halogen–lithium exchange in [${query}] series was investigated…`,
      translated_snippet: `…考察了[${query}]系列中的卤素-锂交换…`,
    },
    {
      document_id: "doc-1b8c52d9a304",
      job_id: "20260520-att-001",
      page_idx: 3,
      block_id: "b-sec3-2",
      source_snippet: `…scaled dot-product attention relates to [${query}] in the encoder…`,
      translated_snippet: `…缩放点积注意力与编码器中的[${query}]相关…`,
    },
  ];
  return { hits: hits.slice(0, limit) };
}

// ===== 阅读区域(锚点/选区取文 e2e 用) =====

export function getMockReaderRegions() {
  return {
    items: [
      {
        item_id: "b-intro-3",
        region_type: "paragraph",
        status: "translated",
        source: {
          page: 1,
          bbox: [57, 52, 540, 96],
          text: "Source PDF",
        },
        translated: {
          page: 1,
          bbox: [57, 52, 540, 96],
          text: "原始 PDF",
        },
      },
      {
        item_id: "b-body-1",
        region_type: "paragraph",
        status: "translated",
        source: {
          page: 1,
          bbox: [57, 100, 540, 150],
          text: "RetainPDF Mock Preview",
        },
        translated: {
          page: 1,
          bbox: [57, 100, 540, 150],
          text: "RetainPDF 联调预览",
        },
      },
    ],
  };
}
