# `pages/home/features` — 主页 React 功能域

主页 **UI / view-store / 对话框** 放这里。  
命令式领域（`mount*`、轮询、ports）在 **`src/js/features`**，经 `../composition/external.ts` 接入。

完整双树对照见 **`src/FEATURES.md`**。

## 目录

| 域 | 说明 |
|----|------|
| `library/` | 书架、书籍详情、卡片 actions（见 [library/README.md](./library/README.md)） |
| `collections/` | 合集 / 分类相关 |
| `upload/` | 上传区 React store / 视图 |
| `workflow/` | 翻译工作流对话框 runtime + UI |
| `status/` | 主状态区、状态卡 store |
| `status-detail/` | 状态详情弹窗 store / controller |
| `credentials/` | 凭据设置 UI |
| `glossaries/` | 术语表 UI |
| `app-update/` | 应用更新条 |
| `app-shell/` | 底栏等壳 |
| `reader/` | 主页侧「打开阅读」对话框 store（不是 `pages/reader` 阅读器） |
| `settings/` | 设置入口编排 |

## 规则

1. **新 UI** 优先落本目录对应域，不要塞进 `js/features`。
2. **需要调用 `src/js/*`（含 api / config / job-status / features…）**：**禁止**直接 `import … from "../../../../js/…"`。一律从 `../composition/external.js`（按深度调整 `../`）拿；缺符号时**只改** `composition/external.ts`。门禁：`tests/architecture-boundaries.test.mjs`。
3. **library 进度契约**：打开工作流弹窗用 `selectJob`；只接进度不弹窗用 `attachJobProgress`（见 library README）。
4. 与 **`pages/reader`** 无关：阅读页代码在 `pages/reader/**`。
