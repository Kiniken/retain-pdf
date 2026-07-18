import type {
  AiRectLike,
  BuildReaderAiChatPayloadOptions,
  CreateReaderRemoteAnswererOptions,
  PixelRect,
  ReaderAiChatApiPayload,
  ReaderAiChatSelectionPayload,
  ReaderRemoteAnswerRequest,
} from "../types.js";

function normalizeRect(rect: AiRectLike = {}): PixelRect {
  return {
    left: Number(rect.left || 0),
    top: Number(rect.top || 0),
    width: Number(rect.width || 0),
    height: Number(rect.height || 0),
  };
}

export function buildReaderAiChatPayload({
  apiKey = "",
  baseUrl = "",
  question = "",
  model = "",
  provider = "deepseek",
  scope = "document",
  context = null,
  history = [],
}: BuildReaderAiChatPayloadOptions = {}): ReaderAiChatApiPayload {
  // Preserve original branch: either normalize from context.rect, or pass nested selection through.
  const selection = (context?.rect
    ? {
        page: Number(context.page || 0),
        rect: normalizeRect(context.rect),
      }
    : context?.selection || null) as ReaderAiChatSelectionPayload | null;
  return {
    message: `${question}`.trim(),
    scope: scope || "document",
    provider: `${provider || "deepseek"}`.trim() || "deepseek",
    model: `${model || ""}`.trim() || undefined,
    api_key: `${apiKey || ""}`.trim() || undefined,
    base_url: `${baseUrl || ""}`.trim() || undefined,
    context: {
      page: context?.page ? Number(context.page) : undefined,
      selection: selection || undefined,
      mode: context?.mode || undefined,
    },
    history: Array.isArray(history) ? history.slice(-8) : [],
  };
}

export function createReaderRemoteAnswerer({
  apiKey = "",
  baseUrl = "",
  jobId = "",
  model = "",
  provider = "deepseek",
  submitAiChat,
}: CreateReaderRemoteAnswererOptions = {}) {
  async function answer({
    question = "",
    scope = "document",
    context = null,
    history = [],
  }: ReaderRemoteAnswerRequest = {}) {
    const payload = buildReaderAiChatPayload({
      context,
      history,
      apiKey,
      baseUrl,
      model,
      provider,
      question,
      scope,
    });
    if (!payload.message) {
      throw new Error("请输入问题。");
    }
    // submitAiChat is injected by the data port; call as-is to preserve missing-fn throw.
    return (submitAiChat as (id: string, body: ReaderAiChatApiPayload) => Promise<unknown>)(
      jobId,
      payload,
    );
  }

  return {
    answer,
    ensureLoaded: async () => true,
  };
}
