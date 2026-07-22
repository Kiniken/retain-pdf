# library 域目录

按**组件角色**分文件夹，避免所有 JSX 平铺在一层。

| 目录 | 放什么 | 不放什么 |
|------|--------|----------|
| **shell/** | 通用壳：`BookCard`、`BookListRow` | 业务 onClick、列表数据 |
| **actions/** | 卡片按钮工厂：`read` / `translate` | UI 布局 |
| **display/** | 封面 hook、徽标 | 页面编排 |
| **page/** | 书架页：网格、工具条、filter、viewPort | 详情/合集弹窗 |
| **categories/** | 合集 tab | 书架网格 |
| **detail/** | 详情容器 + store + hooks | 卡片壳 |
| **detail/shell/** | `BookDetailShell`（Dialog 开合 / 双栏槽） | 业务逻辑 |
| **detail/panels/** | 细粒度区块（封面、标题表单、翻译工作台…） | Tab 组装 |
| **detail/tabs/** | 三个 Tab 组件 + Tab 导航壳 | 领域 API |
| **detail/use-book-detail-*.js** | live item / document / translate hooks | UI 组件 |
| **domain/** | `controller`（翻译/删除/入库/静默接进度…） | 纯 UI |

### 进度入口契约（易混）

| 方法 | 谁提供 | 做什么 |
|------|--------|--------|
| `selectJob(jobId)` | recent-jobs actions | **打开工作流弹窗** + 开始轮询 |
| `attachJobProgress(jobId)` | **library domain/controller** | **只**开始轮询，接进 statusCardStore；不弹窗、关掉主状态区 |

书籍详情「翻译」Tab 只用 `attachJobProgress`。

对外请用 `import { … } from "./features/library/index.js"`。

```text
App
 └─ page/RecentJobsLibrary
       └─ shell/BookCard  +  actions/*
             └─ 点开 → detail/BookDetailDialog（容器）
                      └─ shell/BookDetailShell
                           ├─ left:  CoverActionsPanel
                           └─ right: BookDetailRightTabs
                                ├─ BookDetailOverviewTab   书籍简介
                                ├─ BookDetailTranslateTab  翻译
                                └─ BookDetailMoreTab       其他操作（含占位）
```
