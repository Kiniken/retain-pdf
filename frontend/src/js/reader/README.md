# `src/js/reader` — 旧阅读引擎 + 少量共享 ports

命令式 pdf.js 管线（`pdf-controller` / `pdf-renderer` / mode / favorites / regions…）。

默认产品路径已是 **react-pdf**（`pages/reader/ReaderAppReactPdf`）。本目录主力服务 **`?engine=legacy`**。

## 分层（与 `pages/reader/README` 对齐）

| 用途 | 模块 | 谁 import |
|------|------|-----------|
| **共享 ports** | `data-port`、`config-port`、`resource-resolver`、`pdf-document`（URL）、`page-state`（进度文案） | 新引擎经 `pages/reader/external.ts`；legacy 也可直接用 |
| **legacy 引擎** | `pdf-controller`、`pdf-renderer`、`viewer-mount-flow`、`selection-favorites`、`favorites/**`、`region-*`、chrome/mode… | 仅 `pages/reader/legacy/**` |
| **legacy AI** | `ai/ask-answerer`、`ai/chat-history-store`、`markdown-render`… | `legacy/ai`、`use-reader-boot` |

## 已删除

| 文件 | 说明 |
|------|------|
| `ai/remote-answerer.ts` | 旧 `/reader/ai/chat` payload 应答器；现网 `ask-answerer` |

## 不要

- 不要在这里加新 UI（批注 / 缩放 / 对照 → `pages/reader` 非 legacy）  
- 不要批量删除 favorites / pdf-*（legacy 仍依赖内部图）  
- 不要假设 `pages/reader/components/*` 扁平存在（已迁 `legacy/components/`）

## 主路径

```text
默认: pages/reader/ReaderAppReactPdf + hooks/ + pdf/ + annotations/ + components/react-pdf/
      js 依赖 → pages/reader/external.ts → 本目录共享 ports
回退: pages/reader/legacy/*  +  本目录命令式引擎
地图: src/FEATURES.md
```
