# retainpdf-ai

常驻 AI 服务:图书馆的 agentic 检索问答。无状态——数据面(documents /
favorites / FTS)只归 Rust API 管,本服务经 HTTP 读;块文本直读任务目录
产物(只读)。

## 架构

```
POST /v1/ask ──▶ RetrievalAgent(薄循环,DeepSeek function calling)
                    │  工具注册表(与主流 agent SDK 同构的 name+schema+handler)
                    ├── list_documents    → Rust /api/v1/documents
                    ├── search_fulltext   → Rust /api/v1/search(FTS5 锚点命中)
                    ├── read_blocks       → data/jobs/<job>/{ocr,translated}(只读)
                    └── search_favorites  → Rust /api/v1/favorites
返回:answer + citations[](带 document/job/page/block 锚点,可跳转阅读器)+ tool_trace
```

刻意不用 agent 框架:单 provider、单用户本地服务,裸循环全权掌控超时/
轮数/引用编号;工具定义同构,将来迁移只换循环外壳。

## 运行

```bash
RETAIN_AI_API_KEYS=dev-local-key \
RETAIN_AI_RUST_API_KEY=dev-local-key \
RETAIN_AI_LLM_API_KEY=sk-... \
python3 -m retainpdf_ai
# 默认 127.0.0.1:41100;在 backend/ai_service 目录下运行
```

环境变量(均有默认值,凭证除外):

| 变量 | 默认 | 说明 |
|---|---|---|
| `RETAIN_AI_API_KEYS` | 必填 | 本服务的 X-API-Key 集合(逗号分隔) |
| `RETAIN_AI_RUST_API_KEY` | 必填 | 调用 Rust API 的 key |
| `RETAIN_AI_LLM_API_KEY` | 必填 | DeepSeek(或兼容端点)key |
| `RETAIN_AI_RUST_API_BASE` | `http://127.0.0.1:41000` | Rust API 地址 |
| `RETAIN_AI_LLM_BASE_URL` | `https://api.deepseek.com/v1` | LLM 端点 |
| `RETAIN_AI_LLM_MODEL` | `deepseek-v4-flash` | 模型 |
| `RETAIN_AI_PORT` | `41100` | 监听端口 |
| `RETAIN_AI_MAX_TOOL_ROUNDS` | `6` | agent 工具轮数上限 |
| `RETAIN_AI_MEMORY_WINDOW_TURNS` | `6` | 近期保留对话轮数 |
| `RETAIN_AI_MEMORY_COMPRESS_AFTER_TURNS` | `12` | 超过则抽取式压缩早期轮次 |
| `RETAIN_AI_MEMORY_MAX_CHARS` | `24000` | 喂给模型的 history 字符上限 |
| `RETAIN_AI_DATA_ROOT` | `<repo>/data` | 任务产物根目录 |

## 调用示例

```bash
curl -s -X POST http://127.0.0.1:41100/v1/ask \
  -H "X-API-Key: dev-local-key" -H "Content-Type: application/json" \
  -d '{"question": "库里哪篇文献讨论了卤素锂交换的选择性?结论是什么?"}'
```

## 测试

```bash
cd backend/ai_service && python3 -m pytest tests/ -q
```
