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
  ];
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
} = {}) {
  let list = documents();
  if (`${readingStatus}`.trim()) {
    list = list.filter((item) => item.reading_status === `${readingStatus}`.trim());
  }
  if (`${tag}`.trim()) {
    list = list.filter((item) => item.tags.includes(`${tag}`.trim()));
  }
  return {
    documents: list.slice(offset, offset + limit),
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
  return { ...found };
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
    return { ...byActive };
  }
  const historicalDocId = MOCK_HISTORICAL_JOB_TO_DOCUMENT[normalized];
  if (historicalDocId) {
    const doc = documents().find((item) => item.document_id === historicalDocId);
    return doc ? { ...doc } : null;
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
  return { ...found };
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
