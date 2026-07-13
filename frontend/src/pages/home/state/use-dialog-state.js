// dialog-store(createDialogStore)→ React 订阅 hook。state 对象引用只在
// open()/close() 时更新,直接喂 useSyncExternalStore(镜像 reader 的
// use-drawer-active.js)。

import { useSyncExternalStore } from "react";

export function useDialogState(dialogStore) {
  return useSyncExternalStore(
    dialogStore.subscribe,
    dialogStore.getState,
    dialogStore.getState,
  );
}
