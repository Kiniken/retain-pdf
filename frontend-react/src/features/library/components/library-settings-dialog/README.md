# Library Settings Dialog 组件族

## 边界

`library-settings-dialog` 负责图书馆主页的设置弹窗。当前只提供设置分区占位，不直接读写 API、localStorage 或全局状态。

## 文件

- `library-settings-dialog.tsx`：弹窗组合层。
- `library-settings-config.ts`：布局 class 和组件族本地配置。
- `library-settings-selectors.ts`：把配置转换为设置视图数据。
- `library-settings-tabs.tsx`：设置分区 tab 切换。
- `library-settings-panel.tsx`：单个设置分区面板。
- `library-settings-types.ts`：设置组件族类型。
- `index.ts`：组件族公共出口。

## 规则

- 产品文案来自 `library-config.ts`。
- 后续真实设置项应先补类型和 view model，再交给展示组件渲染。
- 不要把后端 API 字段直接写进展示组件。
