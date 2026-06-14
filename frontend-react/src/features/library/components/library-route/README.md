# Library Route

`LibraryRoute` 是图书馆页面的组合容器。

- 只负责把 `useLibraryController` 的状态和动作接到页面、详情、阅读器和设置弹窗。
- 不写筛选、下载、删除、请求后端等业务逻辑。
- 不放具体 UI 文案；文案仍然走 `library-config.ts`。
- 阅读器静态接入，打开对照阅读时不再额外加载组件包。

这个边界让 `App.tsx` 保持入口职责，也让页面级状态不会进入纯展示组件。
