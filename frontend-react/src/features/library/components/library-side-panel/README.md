# Library Side Panel 组件族

## 边界

`library-side-panel` 负责主页左侧的可折叠功能入口。它只展示入口和轻量操作面板，真实动作通过回调交给页面容器处理。

## 文件

- `library-side-panel.tsx`：展开/收起组合层。
- `library-side-panel-trigger.tsx`：收起状态的小按钮。
- `library-side-panel-item.tsx`：展开状态的单个功能项，支持激活态和点击回调。
- `library-side-panel-config.ts`：布局 class。
- `library-side-panel-types.ts`：组件族类型。
- `index.ts`：公共出口。

## 规则

- 功能文案和图标列表来自 `library-config.ts`。
- 真实功能通过回调传入，不在 item 组件里直接请求 API。
- 多选模式只在这里展示选择数量和批量操作按钮，选择集合由页面容器维护。
