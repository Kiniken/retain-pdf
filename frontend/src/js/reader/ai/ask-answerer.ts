import { API_PREFIX } from "../../config/api-constants.js";
import { askLibraryAi } from "../../api/ai.js";
import { fetchDocumentByJobId } from "../../api/documents.js";
import { resolveReaderAiConfig } from "./config.js";

// 阅读器问答的 agentic 应答器:走 /api/v1/ai/ask(带 SSE 过程事件与可跳转引用)。
// document_id 经后端 GET /documents?job_id= 直查(含历史 run),查不到时退化为全库问答。
// 新接口没有 scope 字段,页/选区范围以前缀写进 question 文本。

const QUOTE_MAX_LENGTH = 240;

function clipQuoteText(text = "", maxLength = QUOTE_MAX_LENGTH) {
  const normalized = `${text}`.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength).trim()}…`;
}

export function buildScopedQuestion({ question = "", scope = "document", context = null, resolveQuote = null } = {}) {
  const trimmed = `${question}`.trim();
  if (!trimmed) {
    return "";
  }
  if (scope === "selection") {
    const quote = typeof resolveQuote === "function" && context ? resolveQuote(context) : null;
    const quoteText = clipQuoteText(quote?.quoteText || "");
    if (quoteText) {
      return `（针对选中的原文片段：「${quoteText}」）${trimmed}`;
    }
    if (context?.page) {
      return `（针对第 ${Number(context.page)} 页的选区内容）${trimmed}`;
    }
  }
  if (scope === "page" && context?.page) {
    return `（当前第 ${Number(context.page)} 页）${trimmed}`;
  }
  return trimmed;
}

export function createReaderAskAnswerer({
  jobId = "",
  apiPrefix = API_PREFIX,
  ask = askLibraryAi,
  documentByJobId = fetchDocumentByJobId,
  resolveQuote = null,
  // 前端凭据设置里的模型 API Key(与翻译流程同源),按请求随问答一起传给后端
  llmConfig = resolveReaderAiConfig,
} = {}) {
  let documentIdPromise = null;

  function resolveDocumentId() {
    if (!documentIdPromise) {
      documentIdPromise = (async () => {
        try {
          const document = await documentByJobId(apiPrefix, jobId) as { document_id?: string } | null | undefined;
          return `${document?.document_id || ""}`.trim();
        } catch (_err) {
          return "";
        }
      })();
    }
    return documentIdPromise;
  }

  async function answer({
    question = "",
    scope = "document",
    context = null,
    onToolEvent = null,
    onAnswerDelta = null,
  } = {}) {
    const scopedQuestion = buildScopedQuestion({ context, question, resolveQuote, scope });
    if (!scopedQuestion) {
      throw new Error("请输入问题。");
    }
    const documentId = await resolveDocumentId();
    const config = typeof llmConfig === "function" ? llmConfig() : (llmConfig || {});
    const result = await ask({
      question: scopedQuestion,
      documentId,
      onToolEvent,
      onAnswerDelta,
      llmApiKey: config.apiKey || "",
      llmBaseUrl: config.baseUrl || "",
      llmModel: config.model || "",
    });
    return {
      ...result,
      scope,
    };
  }

  return {
    answer,
    ensureLoaded: async () => {
      // 提前预热 document_id 反查,失败不阻塞(退化为全库问答)
      void resolveDocumentId();
      return true;
    },
  };
}
