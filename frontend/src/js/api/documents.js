import { buildApiHeaders, isMockMode } from "../config/runtime.js";
import { unwrapEnvelope } from "../job/core.js";
import {
  getMockDocument,
  getMockDocumentByJobId,
  getMockDocumentList,
  patchMockDocument,
  translateMockDocument,
} from "../mock/documents.js";
import { buildApiEndpoint } from "./http.js";

export async function fetchDocumentList(apiPrefix, {
  limit = 50,
  offset = 0,
  readingStatus = "",
  tag = "",
  collectionId = "",
} = {}) {
  if (isMockMode()) {
    return getMockDocumentList({ limit, offset, readingStatus, tag, collectionId });
  }
  const params = new URLSearchParams();
  params.set("limit", `${limit}`);
  params.set("offset", `${offset}`);
  if (`${readingStatus || ""}`.trim()) {
    params.set("reading_status", `${readingStatus}`.trim());
  }
  if (`${tag || ""}`.trim()) {
    params.set("tag", `${tag}`.trim());
  }
  if (`${collectionId || ""}`.trim()) {
    params.set("collection_id", `${collectionId}`.trim());
  }
  const resp = await fetch(`${buildApiEndpoint(apiPrefix, "documents")}?${params.toString()}`, {
    headers: buildApiHeaders(),
  });
  if (!resp.ok) {
    throw new Error(`读取文档库失败，请稍后重试。(${resp.status})`);
  }
  return unwrapEnvelope(await resp.json());
}

// 按任意 job_id(含历史 run)直查其所属文档,后端负责解析——前端不再扫列表反查。
// 返回该文档记录或 null(job 不属于任何文档时)。
export async function fetchDocumentByJobId(apiPrefix, jobId) {
  const normalized = `${jobId || ""}`.trim();
  if (!normalized) {
    return null;
  }
  if (isMockMode()) {
    return getMockDocumentByJobId(normalized);
  }
  const params = new URLSearchParams();
  params.set("job_id", normalized);
  const resp = await fetch(`${buildApiEndpoint(apiPrefix, "documents")}?${params.toString()}`, {
    headers: buildApiHeaders(),
  });
  if (!resp.ok) {
    throw new Error(`按 job 查文档失败，请稍后重试。(${resp.status})`);
  }
  const { documents = [] } = unwrapEnvelope(await resp.json()) || {};
  return Array.isArray(documents) && documents.length ? documents[0] : null;
}

export async function fetchDocument(apiPrefix, documentId) {
  const normalized = `${documentId || ""}`.trim();
  if (!normalized) {
    throw new Error("缺少 document_id。");
  }
  if (isMockMode()) {
    return getMockDocument(normalized);
  }
  const resp = await fetch(buildApiEndpoint(apiPrefix, `documents/${encodeURIComponent(normalized)}`), {
    headers: buildApiHeaders(),
  });
  if (!resp.ok) {
    throw new Error(`读取文档详情失败，请稍后重试。(${resp.status})`);
  }
  return unwrapEnvelope(await resp.json());
}

// body 支持 { title?, reading_status?, tags? };tags 是整体替换语义(传 [] 即清空)
export async function patchDocument(apiPrefix, documentId, payload = {}) {
  const normalized = `${documentId || ""}`.trim();
  if (!normalized) {
    throw new Error("缺少 document_id。");
  }
  if (isMockMode()) {
    return patchMockDocument(normalized, payload);
  }
  const resp = await fetch(buildApiEndpoint(apiPrefix, `documents/${encodeURIComponent(normalized)}`), {
    method: "PATCH",
    headers: {
      ...buildApiHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const envelope = await resp.json().catch(() => null);
    throw new Error(`${envelope?.message || "更新文档失败，请稍后重试。"}(${resp.status})`);
  }
  return unwrapEnvelope(await resp.json());
}

// 对馆藏文档发起"以后再翻":复用文档已存的 upload 起 book 翻译 job。
// 后端 translate_document 会注入该文档的 upload_id 并把 workflow 归一到 book/translate,
// 前端只需带一个最小 CreateJobInput(workflow 缺省即 book)。返回 JobSubmissionView。
export async function translateDocument(apiPrefix, documentId, payload = {}) {
  const normalized = `${documentId || ""}`.trim();
  if (!normalized) {
    throw new Error("缺少 document_id。");
  }
  if (isMockMode()) {
    return translateMockDocument(normalized);
  }
  const resp = await fetch(
    buildApiEndpoint(apiPrefix, `documents/${encodeURIComponent(normalized)}/translate`),
    {
      method: "POST",
      headers: {
        ...buildApiHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  if (!resp.ok) {
    const envelope = await resp.json().catch(() => null);
    throw new Error(`${envelope?.message || "发起翻译失败，请稍后重试。"}(${resp.status})`);
  }
  return unwrapEnvelope(await resp.json());
}
