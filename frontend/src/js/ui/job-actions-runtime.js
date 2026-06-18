export function createJobActionsRuntime({
  runtimeState,
  resetUpload,
  clearTiming,
} = {}) {
  function resetUploadedFileState() {
    resetUpload?.(runtimeState, { includePageRange: false });
    clearTiming?.(runtimeState);
  }

  return Object.freeze({
    resetUploadedFileState,
    state: runtimeState,
  });
}
