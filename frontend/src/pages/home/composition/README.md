# home/composition

主页装配层。**只接线，不写业务。**

## 规则（后期维护必读）

1. **`external.ts` 是唯一的 `../../../js/*` 入口**  
   领域工厂禁止再直接 import `src/js/**`。新增外部依赖只改 `external.ts`。  
   源码已全量 TS（`src/**` 无 `.js/.jsx`）；import 路径仍可写 `.js`（esbuild / test loader 映射到 `.ts/.tsx`）。  
   已去掉全库 `@ts-nocheck`；`tsc --noEmit` 应 0 错误。类型多为最小标注（`: any` / 公共 `HomeServices`），可继续按域收紧。

2. **工厂返回 bag，不写可变 `ctx`**  
   `createXxx(...)` 返回自己的产物；`composition.js` 显式赋值到 `features` / `domains`。

3. **`features` 是唯一可变注册表**  
   晚绑定（A 装配时 B 尚未创建）通过 `features.xxx` 读，装配完成后再调用。

4. **runtime 一次挂齐**  
   `job-runtime` / `recent-jobs` / `artifact-downloads` 在 composition 阶段创建，不放进 `initialize` 的 `if (!feature)` 懒挂载。

5. **事件注册顺序有契约**  
   `workflowDialog.bindEvents()` 必须先于 `mountRecentJobsFeature`  
  （`closeTranslationWorkflow` 时要先写 DOM `data-open`，recent-jobs 才能 `scheduleRefresh`）。

## 文件

| 文件 | 职责 |
|------|------|
| `../composition.js` | 顺序接线入口 |
| `external.js` | 外部依赖 barrel |
| `create-bridge.js` | 3b 回调桥 |
| `create-workflow-upload.js` | workflow + upload |
| `create-credentials.js` | 凭据 |
| `create-glossaries-app-update.js` | 术语表 + 更新 |
| `create-status-domain.js` | statusCard / detail / reader |
| `create-library-domain.js` | library / recent-jobs ports / collections |
| `create-app-actions.js` | 提交任务 |
| `create-runtime-features.js` | job-runtime / recent-jobs / artifacts |
| `create-lifecycle.js` | initialize / dispose |
| `build-home-services.js` | 对外 HomeServices bag |
