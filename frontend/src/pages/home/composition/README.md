# home/composition

主页装配层。**只接线，不写业务。**

双 features 对照（`js/features` vs `pages/home/features`）见 **`src/FEATURES.md`**。

## 规则（后期维护必读）

1. **`external.ts` 是主页对 `src/js/*` 的唯一入口（features 层）**  
   - `pages/home/features/**` **禁止**直接 import 任何 `src/js/**`；一律 `from "../composition/external.js"`（深度自调）。  
   - 领域工厂（`create-*.ts`）也应经 `./external.js`，不要再开 `../../../js/…`。  
   - `composition/types.ts` 的 port/store 类型也从 `./external.js` 拿。  
   - 缺符号只改 `external.ts`；门禁见 `tests/architecture-boundaries.test.mjs`。  
   源码已全量 TS；import 路径仍可写 `.js`（esbuild / test loader 映射到 `.ts/.tsx`）。

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
