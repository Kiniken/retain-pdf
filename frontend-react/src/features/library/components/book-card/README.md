# Book Card 组件族

## 边界

`book-card` 负责图书馆首页里的单本书卡片。它是一个组件族，外部代码应该从 `./book-card` 这个入口导入，不要直接依赖内部文件。

## 文件

- `book-card.tsx`：组合层，把 `LibraryBook` 转成卡片各部分需要的 props。
- `book-card-shell.tsx`：可点击外壳、hover 效果和选中态。
- `book-card-meta.tsx`：标题和作者区域的布局。
- `book-status-badge.tsx`：旧状态标记组件，当前卡片不展示状态，保留给后续列表密度模式复用。
- `index.ts`：组件族的公共出口。

## 规则

- 产品文案和状态定义放在 `library-config.ts`。
- 数据结构定义放在 `types.ts`。
- 后续只要是书卡片自己的展示能力，就优先放在这个目录里。
- 外部只导入 `BookCard`，内部小组件默认不对外暴露。
- 点击卡片主体进入详情。
- hover 封面中心出现眼睛按钮，点击眼睛进入对照阅读。
- hover 封面右上角出现删除按钮，点击删除只触发删除回调，不打开详情。
