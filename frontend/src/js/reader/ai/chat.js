import { createReaderMarkdownAnswerer } from "./markdown-answerer.js";

function formatCitations(citations = []) {
  if (!Array.isArray(citations) || !citations.length) {
    return "";
  }
  return `\n\n引用：\n${citations
    .slice(0, 4)
    .map((item, index) => `${index + 1}. ${item.title || "相关片段"}${item.page ? ` · 第 ${item.page} 页` : ""}${item.snippet ? `：${item.snippet}` : ""}`)
    .join("\n")}`;
}

function renderMessageText(message, text = "", citations = []) {
  const body = message?.readerAiMessageBody || message?.querySelector?.("[data-reader-ai-message-body]");
  if (!body) {
    return;
  }
  body.textContent = `${text}${formatCitations(citations)}`;
}

function appendMessage(threadEl, { role = "assistant", title = "", text = "", citations = [] } = {}) {
  if (!threadEl || (!text && role !== "assistant")) {
    return null;
  }
  const documentRef = threadEl.ownerDocument || globalThis.document;
  const message = documentRef.createElement("article");
  message.className = `reader-ai-message reader-ai-message-${role}`;
  const label = documentRef.createElement("span");
  label.textContent = title || (role === "user" ? "你" : "RetainPDF AI");
  const body = documentRef.createElement("p");
  if (!body.dataset) {
    body.dataset = {};
  }
  body.dataset.readerAiMessageBody = "1";
  message.readerAiMessageBody = body;
  message.append(label, body);
  threadEl.appendChild(message);
  renderMessageText(message, text, citations);
  threadEl.scrollTop = threadEl.scrollHeight;
  return message;
}

function streamMessageText(message, text = "", citations = [], { chunkSize = 3, intervalMs = 12 } = {}) {
  if (!message) {
    return Promise.resolve();
  }
  const fullText = `${text || ""}`;
  let index = 0;
  renderMessageText(message, "", []);
  return new Promise((resolve) => {
    function tick() {
      index = Math.min(fullText.length, index + chunkSize);
      renderMessageText(message, fullText.slice(0, index), []);
      message.parentElement?.scrollTo?.({ top: message.parentElement.scrollHeight });
      if (index >= fullText.length) {
        renderMessageText(message, fullText, citations);
        resolve();
        return;
      }
      globalThis.window?.setTimeout?.(tick, intervalMs) ?? setTimeout(tick, intervalMs);
    }
    tick();
  });
}

function setComposerState({ inputEl, submitEl, statusEl }, state, text) {
  const busy = state === "busy";
  const disabled = state === "disabled";
  if (inputEl) {
    inputEl.disabled = disabled || busy;
  }
  if (submitEl) {
    submitEl.disabled = disabled || busy;
    submitEl.textContent = busy ? "生成中" : "发送";
  }
  if (statusEl) {
    statusEl.textContent = text || "";
  }
}

export function createReaderAiChat({
  documentRef = globalThis.document,
  jobId = "",
  aiContext = null,
  answerer = null,
  fallbackAnswerer = null,
  loadMarkdownPayload = null,
  remoteAnswerer = null,
} = {}) {
  const formEl = documentRef?.querySelector?.("[data-reader-ai-composer]");
  const inputEl = documentRef?.getElementById?.("reader-ai-input");
  const submitEl = documentRef?.getElementById?.("reader-ai-submit-btn");
  const statusEl = documentRef?.getElementById?.("reader-ai-status");
  const threadEl = documentRef?.getElementById?.("reader-ai-thread");
  const localAnswerer = fallbackAnswerer || createReaderMarkdownAnswerer({ loadMarkdownPayload });
  const primaryAnswerer = answerer || remoteAnswerer || localAnswerer;
  const history = [];

  async function prepare() {
    try {
      setComposerState({ inputEl, submitEl, statusEl }, "busy", remoteAnswerer ? "正在连接阅读问答..." : "正在加载 Markdown...");
      await primaryAnswerer.ensureLoaded?.(jobId);
      setComposerState({ inputEl, submitEl, statusEl }, "ready", remoteAnswerer ? "后端阅读问答已就绪" : "基于当前 Markdown 回答");
      return true;
    } catch (error) {
      if (!remoteAnswerer) {
        setComposerState({ inputEl, submitEl, statusEl }, "disabled", error?.message || "Markdown 暂不可用");
        return false;
      }
      try {
        await localAnswerer.ensureLoaded?.(jobId);
        setComposerState({ inputEl, submitEl, statusEl }, "ready", "后端问答暂不可用，已切到 Markdown 本地检索");
        return true;
      } catch (fallbackError) {
        setComposerState({ inputEl, submitEl, statusEl }, "disabled", fallbackError?.message || error?.message || "问答暂不可用");
        return false;
      }
    }
  }

  async function answerWithFallback(options) {
    try {
      return {
        fallback: false,
        result: await primaryAnswerer.answer(options),
      };
    } catch (error) {
      if (!remoteAnswerer) {
        throw error;
      }
      const result = await localAnswerer.answer(options);
      return {
        fallback: true,
        reason: error?.message || "后端问答失败",
        result,
      };
    }
  }

  function remember(role, content) {
    history.push({ role, content });
    if (history.length > 12) {
      history.splice(0, history.length - 12);
    }
  }

  async function submit(question = inputEl?.value || "") {
    const trimmed = `${question}`.trim();
    if (!trimmed) {
      return null;
    }
    appendMessage(threadEl, {
      role: "user",
      text: trimmed,
      title: "你",
    });
    remember("user", trimmed);
    if (inputEl) {
      inputEl.value = "";
    }
    try {
      setComposerState({ inputEl, submitEl, statusEl }, "busy", remoteAnswerer ? "正在请求后端阅读问答..." : "正在从 Markdown 中查找...");
      const { fallback, reason, result } = await answerWithFallback({
        context: aiContext?.context?.(),
        history,
        jobId,
        question: trimmed,
        scope: aiContext?.scope?.() || "document",
      });
      const answerText = fallback
        ? `${result.answer}\n\n注：后端阅读问答暂不可用，已使用本地 Markdown 检索。${reason ? `原因：${reason}` : ""}`
        : result.answer;
      const assistantMessage = appendMessage(threadEl, {
        role: "assistant",
        text: "",
        title: "RetainPDF AI",
      });
      await streamMessageText(assistantMessage, answerText, result.citations);
      remember("assistant", result.answer || answerText);
      setComposerState({ inputEl, submitEl, statusEl }, "ready", fallback ? "已回退到 Markdown 本地检索" : "后端阅读问答已完成");
      return result;
    } catch (error) {
      appendMessage(threadEl, {
        role: "assistant",
        text: error?.message || "生成回答失败。",
        title: "RetainPDF AI",
      });
      setComposerState({ inputEl, submitEl, statusEl }, "ready", "回答失败，可重试");
      return null;
    }
  }

  function bindEvents() {
    formEl?.addEventListener?.("submit", (event) => {
      event.preventDefault();
      void submit();
    });
    void prepare();
  }

  return {
    bindEvents,
    prepare,
    submit,
  };
}
