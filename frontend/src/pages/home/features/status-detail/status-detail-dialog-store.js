// StatusDetailDialog 的开合状态实例(用 state/dialog-store.js 通用工厂,
// 蓝图 §1"新 store"清单第二项)。payload 携带 { activeTab },open(tabName)
// 与 activateTab(tabName) 都直接调用 dialogStore.open({ activeTab }) ——
// createDialogStore().open() 对已 open 的状态只合并 payload、不重复触发
// showModal(StatusDetailDialog.jsx 的 effect 只在 open 从 false→true 时才
// 调 showModal),所以"打开时指定 tab"与"打开后切 tab"可以复用同一个方法。

import { createDialogStore } from "../../state/dialog-store.js";

export function createStatusDetailDialogStore() {
  return createDialogStore({ activeTab: "overview" });
}
