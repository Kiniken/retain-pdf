function normalizeRect(rect = {}) {
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
} = {}) {
  const selection = context?.rect
    ? {
        page: Number(context.page || 0),
        rect: normalizeRect(context.rect),
      }
    : context?.selection || null;
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
} = {}) {
  async function answer({ question = "", scope = "document", context = null, history = [] } = {}) {
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
    return submitAiChat(jobId, payload);
  }

  return {
    answer,
    ensureLoaded: async () => true,
  };
}
