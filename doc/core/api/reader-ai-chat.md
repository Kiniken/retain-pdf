# Reader AI Chat API

RetainPDF 后端提供一个最小但可扩展的阅读问答接口。前端不传模型密钥；后端只读取服务端环境变量。

## Endpoint

`POST /api/v1/jobs/{job_id}/reader/ai/chat`

## Request

```json
{
  "message": "这篇文章的核心贡献是什么？",
  "scope": "document",
  "provider": "deepseek",
  "model": "deepseek-chat",
  "api_key": "sk-...",
  "base_url": "https://api.deepseek.com/v1",
  "context": {
    "page": 3,
    "selection": {
      "page": 3,
      "rect": { "left": 120, "top": 240, "width": 300, "height": 180 }
    },
    "mode": "compare"
  },
  "history": [
    { "role": "user", "content": "先总结一下" },
    { "role": "assistant", "content": "..." }
  ]
}
```

当前第一版只支持 `scope=document`。`context` 和 `history` 可选；`context.page` / `selection.page` 会作为检索加权线索。

模型配置字段可选：

- `provider`: 可选，默认 `deepseek`，支持 `deepseek` / `openai`。
- `model`: 可选，DeepSeek 默认 `deepseek-chat`。
- `api_key`: 可选，前端直接传入时优先使用。后端不会写入 job snapshot、events 或返回体。
- `base_url`: 可选，DeepSeek 默认 `https://api.deepseek.com/v1`。

## Response

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "answer": "这篇文章主要提出了...",
    "citations": [
      {
        "title": "Introduction",
        "page": 1,
        "snippet": "..."
      }
    ],
    "used_context": {
      "source": "markdown",
      "scope": "document"
    }
  }
}
```

## Backend Behavior

第一版流程：

1. 根据 `job_id` 优先读取本地结构化翻译产物：`jobs/{job_id}/translated/translation-manifest.json` 以及它引用的逐页 payload。
2. 从逐页 payload 提取 `page_idx/page_number`、标题角色和 `render_markdown/translated_text` 生成 page-aware chunks。
3. 如果结构化翻译产物不存在或为空，再 fallback 到已发布 Markdown：`jobs/{job_id}/md/full.md`，按标题和段落切 chunk。
4. 根据用户问题选择检索策略：
   - 普通问题：轻量关键词检索，取 top 8 chunk。
   - 泛总结问题：从 Abstract / Introduction / Methods / Results / Discussion / Conclusion 等章节优先取代表 chunk，并对全文做均匀采样，避免只命中第一页。
5. 将 chunk、用户问题和有限历史发送给阅读问答模型。
6. 返回模型答案和后端检索到的引用片段。

注意：优先使用 `translation-manifest.json` 时，`citations[].page` 来自逐页 payload 的 `page_number` 或 `page_idx + 1`。只有 fallback 到 `full.md` 时，页码才需要从 Markdown 文本中尝试推导，无法推导则为 `null`。

## Configuration

前端可以在请求体直接传 `api_key`。如果请求体没有传，后端再读取服务端环境变量：

```bash
RETAINPDF_AI_PROVIDER=deepseek
RETAINPDF_AI_MODEL=deepseek-chat
DEEPSEEK_API_KEY=...
```

可选：

```bash
RETAINPDF_AI_BASE_URL=https://api.deepseek.com/v1
RETAINPDF_AI_API_KEY=...
```

优先级：

1. 请求体里的 `provider/model/api_key/base_url`
2. 服务端环境变量 `RETAINPDF_AI_PROVIDER/RETAINPDF_AI_MODEL/RETAINPDF_AI_API_KEY/RETAINPDF_AI_BASE_URL`
3. provider 默认值

默认 provider 是 `deepseek`，也支持 `openai`。`RETAINPDF_AI_API_KEY` 是通用环境变量覆盖项；不设置时，`deepseek` 读取 `DEEPSEEK_API_KEY`，`openai` 读取 `OPENAI_API_KEY`。

## Error Codes

- `404`: job 不存在，或 Markdown 不存在/不可读。
- `409`: 任务还未完成，Markdown 未 ready。
- `429`: 模型服务限流。
- `502`: 模型服务失败或返回无效响应。
- `500`: 后端内部错误，例如 AI provider 未配置。
