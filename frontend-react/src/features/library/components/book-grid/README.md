# Book Grid 组件族

## 边界

`book-grid` 负责图书集合的网格布局。它只接收已经准备好的 `books`，不负责搜索、排序、筛选或请求数据。

## 文件

- `book-grid.tsx`：渲染滚动容器和书卡片网格。
- `index.ts`：组件族的公共出口。

## 规则

- 外部只导入 `BookGrid`。
- 选择态通过 `selectedBookId` 传入。
- 点击行为通过 `onSelectBook` 交给页面或容器处理。
- 后续空状态、加载态、批量选择工具条可以放在这个目录里。
