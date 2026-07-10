# 前端对接说明:图书馆数据层 API

> 后端提交:`9b22e26`(图书馆数据层:documents 一等公民 + 锚点收藏 + FTS5 全文检索)
>
> 现有 `/api/v1/library/books` 接口**原样保留**,图书馆页面可以按节奏迁移,不迁移也不会坏。
> 所有新接口和现有接口一样走 `X-API-Key` 认证,响应统一 `{code, message, data}` 包装。

## 核心概念(前端需要理解的唯一模型变化)

- **document = 一篇 PDF 的稳定身份**(按文件内容 sha256 去重):同一篇 PDF 不管上传几次、
  翻译几次,都是同一个 `document_id`。job 变成了文档名下的"处理记录"。
- **锚点**:收藏和搜索命中都带 `(document_id, job_id, page_idx, block_id)` 四元组,
  `job_id + page + block` 就是阅读器现有的定位坐标,可以直接跳转到原位。

## 接口清单

### 1. 文档列表 / 详情 / 编辑

```
GET  /api/v1/documents?limit=50&offset=0&reading_status=reading&tag=化学&collection_id=xxx
     → data.documents[]: { document_id, title, source_filename, page_count, bytes,
                           active_job_id, reading_status, tags[], added_at,
                           last_opened_at, updated_at, authors_json, year, doi }

GET  /api/v1/documents/:document_id

PATCH /api/v1/documents/:document_id
     body: { title?, reading_status?, tags? }
```

- `reading_status` 只接受 `unread | reading | done`,其他值返回 400;
- `tags` 是**整体替换**语义(传 `[]` 即清空);
- `active_job_id` 是该文档当前生效的处理 run——**打开阅读器就用它**;
- 列表按 `added_at` 倒序,`limit` 上限 500。

### 2. 收藏

```
POST /api/v1/favorites
     body: {
       document_id, page_idx, block_id, quote_text,        ← 必填
       job_id?, char_start?, char_end?, kind?,              ← 可选
       translated_quote_text?, note?
     }
     → data: FavoriteRecord(含生成的 favorite_id 和实际锚定的 job_id)

GET  /api/v1/favorites?document_id=xxx
     → data.favorites[](按页码排序;不传参数 = 全部收藏,按时间倒序)

DELETE /api/v1/favorites/:favorite_id
```

- `job_id` 不传时后端自动锚定文档的 `active_job_id`(推荐:阅读器里收藏就不用管它);
- `quote_text` 是引文快照,必填(选中的原文文本);`translated_quote_text` 建议一起传——
  锚点将来失效时快照保证内容不丢;
- `kind`: `sentence | data | figure`,默认 `sentence`;
- `char_start / char_end` 是块内选区(可选,不传表示整块)。

### 3. 全文检索(中英文都可)

```
GET /api/v1/search?q=光学光谱&limit=20
    → data.hits[]: { document_id, job_id, page_idx, block_id,
                     source_snippet, translated_snippet }
```

- snippet 里命中词用 `[` `]` 包裹,前端可替换成高亮标签;
- 任意长度的 `q` 都能查(≥3 字符走 FTS5 全文索引,更短自动回退模糊匹配);
- `limit` 上限 100。

## 两个必须处理的边界

1. **删除保护**:删除书籍(`DELETE /api/v1/library/books/:job_id`)时,如果该 job 被收藏
   引用,后端返回 **409**,message 里有引用数量——前端要把这个错误呈现为
   "该文档有 N 条收藏,请先删除收藏",而不是通用报错。
2. **重复上传**:同一 PDF 再次上传不会产生新文档(documents 列表数量不变),
   前端不要假设"上传成功 = 列表多一条"。

## 建议的迁移路径(不强制)

1. **第一步只做增量**:阅读器里加"选中 → 收藏"和收藏侧栏(纯新增,不动现有页面)。
   收藏跳转:用锚点里的 `job_id + page_idx + block_id` 复用现有阅读器定位。
2. **第二步**再把图书馆主页从 `/api/v1/library/books` 投影切到 `/api/v1/documents`,
   拿到标签 / 阅读状态 / 合集能力。

## 附:字段速查

| 字段 | 说明 |
|---|---|
| `document_id` | 文件内容 sha256(hex),稳定不变 |
| `active_job_id` | 当前生效的处理 run,阅读器入口 |
| `job_id`(收藏/命中里) | 锚点所在的块空间版本 |
| `block_id` | `document.v1.json` 的块 ID,如 `p001-b0002` |
| `page_idx` | 0 起始页码 |
| `reading_status` | `unread` / `reading` / `done` |
| `kind`(收藏) | `sentence` / `data` / `figure` |
