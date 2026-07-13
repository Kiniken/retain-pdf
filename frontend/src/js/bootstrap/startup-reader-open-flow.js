import {
  defaultStartupRoutePorts,
} from "./startup-route-ports.js";

export async function openReaderDirectly({
  fetchProtected,
  jobId,
  anchor = null,
  ports = defaultStartupRoutePorts,
  setTextFn = ports.setText,
  state,
}) {
  const feature = await ports.ensureReaderDialogFeature({
    state,
    fetchProtected,
    runtimePort: ports.readerDialogRuntimePort,
    setTextFn,
  });
  feature.open({ jobId, anchor });
}
