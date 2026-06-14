# Book Detail Dialog 组件族

## 边界

`book-detail-dialog` 负责单本书的详情弹窗。它展示书籍摘要、操作按钮和当前任务状态，不负责加载书籍数据或调用下载/阅读 API。

## 文件

- `book-detail-dialog.tsx`：弹窗组合层。
- `book-detail-config.ts`：tab 定义和本组件族布局尺寸。
- `book-detail-selectors.ts`：把 `LibraryBook` 转成详情弹窗内部 view model。
- `book-detail-cover-panel.tsx`：左侧封面区域。
- `book-detail-heading.tsx`：标题和作者。
- `book-detail-tabs.tsx`：详情、翻译、文件、进度四个 tab 的组合层。
- `book-detail-overview-panel.tsx`：详情 tab 的组合层。
- `book-detail-fields.tsx`：页数、状态、更新时间。
- `book-detail-translation-panel.tsx`：翻译 tab 的组合层。
- `book-detail-field-list.tsx`：详情字段的通用 label-value 列表。
- `book-detail-translation.tsx`：翻译任务配置摘要。
- `book-detail-artifacts.tsx`：原始 PDF、译文 PDF、对照 PDF 等文件产物。
- `book-detail-artifacts-panel.tsx`：文件 tab 的组合层。
- `book-detail-artifact-row.tsx`：单个文件产物行。
- `book-detail-progress-summary.tsx`：详情弹窗专用的简洁任务进度摘要。
- `book-detail-section.tsx`：详情弹窗内部通用区块。
- `book-detail-actions.tsx`：对照阅读和下载入口。
- `book-detail-status-panel.tsx`：右侧任务进度区域。
- `book-detail-types.ts`：本组件族内部共享的 props 类型。
- `index.ts`：组件族的公共出口。

## 规则

- 外部只导入 `BookDetailDialog`。
- 产品文案来自 `library-config.ts`。
- 固定布局尺寸来自 `book-detail-config.ts`，不要散落在多个 `.tsx` 里。
- 复杂数据派生放在 `book-detail-selectors.ts`，展示组件只接收简单 props。
- `BookDetailDialog` 是唯一允许接收 `LibraryBook` 的组件入口。
- `BookDetailTabs` 和 tab 内组件接收 `BookDetailViewModel` 或更小的 props，不直接依赖 `LibraryBook`。
- 详情弹窗内使用轻量的 `BookDetailProgressSummary`，不要直接嵌完整任务页卡片。
- 真实动作回调从 `BookDetailDialog` props 传入，再下发给内部动作组件。
- 书籍详情、任务进度、下载/阅读动作分别在独立文件里维护，避免组合层变厚。
- 弹窗内容通过 tabs 分区，新增功能时优先新增 tab 内组件，不要把内容直接堆到 `book-detail-dialog.tsx`。
