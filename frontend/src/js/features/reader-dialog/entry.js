import { readerDialogLinkOpenState } from "./contract.js";

let readerDialogComponentPromise = null;
let readerDialogFeature = null;
let readerDialogFeaturePromise = null;

function noopSetText() {}

export async function ensureReaderDialogFeature({
  state,
  fetchProtected,
  setTextFn = noopSetText,
  runtimePort,
}) {
  if (readerDialogFeature) {
    return readerDialogFeature;
  }
  if (!readerDialogFeaturePromise) {
    if (!readerDialogComponentPromise) {
      readerDialogComponentPromise = import("../../components/dialogs/reader-dialog.js")
        .catch((error) => {
          readerDialogComponentPromise = null;
          throw error;
        });
    }
    readerDialogFeaturePromise = readerDialogComponentPromise
      .then(() => import("./controller.js"))
      .then(({ mountReaderDialogFeature }) => {
        const feature = mountReaderDialogFeature({
          state,
          fetchProtected,
          runtimePort,
          setText: setTextFn,
        });
        feature.bindEvents();
        readerDialogFeature = feature;
        return feature;
      })
      .catch((error) => {
        readerDialogFeaturePromise = null;
        throw error;
      });
  }
  return readerDialogFeaturePromise;
}

export async function openReaderFromButton({
  button,
  state,
  fetchProtected,
  setTextFn = noopSetText,
  runtimePort,
}) {
  const { url, disabled } = readerDialogLinkOpenState(button);
  let jobId = "";
  if (url) {
    try {
      jobId = new URL(url, window.location.href).searchParams.get("job_id")?.trim() || "";
    } catch (_err) {
      jobId = "";
    }
  }
  jobId = jobId || runtimePort?.currentJobId?.(state) || "";
  const feature = await ensureReaderDialogFeature({ state, fetchProtected, setTextFn, runtimePort });
  feature.open({
    url,
    jobId,
    disabled,
  });
}
