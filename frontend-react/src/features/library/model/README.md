# Library Model

`model` 放图书馆页面的状态和动作编排。

- `useLibraryController` 负责列表加载、详情缓存、下载、删除、筛选、排序、弹窗开关和多选状态。
- `useLibraryData` 负责列表加载、详情缓存、当前书籍和本地列表移除。
- `useLibraryFeedback` 负责错误提示和短 toast。
- 组件不直接请求后端，也不直接读 mock data。
- 后端响应仍然先经过 `api` adapter 转成 `LibraryBook`，再进入页面状态。

后续如果继续变大，按职责继续拆成 `use-library-selection`、`use-library-downloads`，不要把逻辑塞回组件。
