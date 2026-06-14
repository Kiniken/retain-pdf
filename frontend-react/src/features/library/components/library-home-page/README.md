# Library Home Page 组件族

## 边界

`library-home-page` 负责图书馆主页的页面级布局。它组合顶部栏、筛选工具条和图书网格，但不拥有数据请求、弹窗状态或后端 API。

## 文件

- `library-home-page.tsx`：主页组合层。
- `index.ts`：组件族公共出口。

## 规则

- 页面状态由上层容器传入。
- 产品文案和排序项来自 `library-config.ts`。
- 后续搜索、筛选、上传入口可以在这个组件族内继续拆成独立区域。
