function currentJobSnapshot(state) {
  return state?.currentJobSnapshot || null;
}

function cachedManifestFor(state, jobId) {
  if (!state || !jobId || state.currentJobManifestJobId !== jobId) {
    return null;
  }
  return state.currentJobManifest || null;
}

function uploadSnapshot(state) {
  return {
    uploadId: state?.uploadId || "",
    uploadedFileName: state?.uploadedFileName || "",
    uploadedPageCount: state?.uploadedPageCount || 0,
    uploadedBytes: state?.uploadedBytes || 0,
    appliedPageRange: state?.appliedPageRange || "",
    submitBusy: Boolean(state?.submitBusy),
  };
}

export function createArtifactRuntimePort({
  getCurrentJobSnapshot = currentJobSnapshot,
  getCachedManifestFor = cachedManifestFor,
  getUploadSnapshot = uploadSnapshot,
} = {}) {
  return Object.freeze({
    currentJobSnapshot: (state) => getCurrentJobSnapshot(state),
    cachedManifestFor: (state, jobId) => getCachedManifestFor(state, jobId),
    uploadSnapshot: (state) => getUploadSnapshot(state),
  });
}

export const defaultArtifactRuntimePort = createArtifactRuntimePort();
