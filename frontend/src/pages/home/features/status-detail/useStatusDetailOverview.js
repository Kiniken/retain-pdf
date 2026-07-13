// StatusDetailDialog 家族的唯一装配面(蓝图 §1.2)——把 composition.js 的
// statusDetail 域(services.statusDetail:{store, dialogStore, controller})
// 折成一个 hook,组件只订阅需要的切片,不各自重复 useStoreSnapshot/
// useDialogState 样板(镜像 useCredentialsController.js 的先例)。

import { useStoreSnapshot } from "../../../../shared/react/use-store.js";
import { useHomeServices } from "../../home-services-context.js";
import { useDialogState } from "../../state/use-dialog-state.js";

export function useStatusDetailOverview() {
  const services = useHomeServices();
  const { store, dialogStore, controller } = services.statusDetail;
  const dialogState = useDialogState(dialogStore);
  const snapshot = useStoreSnapshot(store);

  return {
    open: Boolean(dialogState.open),
    activeTab: dialogState.payload?.activeTab || "overview",
    overview: snapshot.overview,
    translation: snapshot.translation,
    rerunPending: snapshot.rerunPending,
    controller,
    dialogStore,
  };
}
