function defaultResetUploadState(targetState = {}, { includePageRange = true } = {}) {
  Object.assign(targetState, {
    uploadId: "",
    uploadedFileName: "",
    uploadedPageCount: 0,
    uploadedBytes: 0,
    submitBusy: false,
  });
  if (includePageRange) {
    targetState.appliedPageRange = "";
  }
}

function defaultClearAppliedPageRange(targetState = {}) {
  targetState.appliedPageRange = "";
}

function defaultResetJobState(targetState = {}) {
  Object.assign(targetState, {
    currentJobId: "",
    currentJobSnapshot: null,
    currentJobManifest: null,
    currentJobManifestJobId: "",
    currentJobManifestFetchedAt: 0,
    currentJobEvents: null,
    currentJobEventsJobId: "",
    currentJobEventsFetchedAt: 0,
    currentJobStageActions: null,
    currentJobStageActionsJobId: "",
    currentJobStageActionsFetchedAt: 0,
    currentJobPollGeneration: 0,
    currentJobPollInFlight: false,
    currentJobEventsFetchInFlight: false,
    currentJobManifestFetchInFlight: false,
    currentJobStageActionsFetchInFlight: false,
    currentJobDisplayedStageKey: "",
    currentJobDisplayedStageJobId: "",
    currentJobStartedAt: "",
    currentJobFinishedAt: "",
  });
}

function defaultResetJobSecondaryState(targetState = {}) {
  Object.assign(targetState, {
    currentJobManifest: null,
    currentJobManifestJobId: "",
    currentJobManifestFetchedAt: 0,
    currentJobEvents: null,
    currentJobEventsJobId: "",
    currentJobEventsFetchedAt: 0,
    currentJobStageActions: null,
    currentJobStageActionsJobId: "",
    currentJobStageActionsFetchedAt: 0,
    currentJobPollInFlight: false,
    currentJobEventsFetchInFlight: false,
    currentJobManifestFetchInFlight: false,
    currentJobStageActionsFetchInFlight: false,
    currentJobDisplayedStageKey: "",
    currentJobDisplayedStageJobId: "",
  });
}

const defaultResetStateAdapter = Object.freeze({
  clearAppliedPageRange: defaultClearAppliedPageRange,
  resetJobSecondaryState: defaultResetJobSecondaryState,
  resetJobState: defaultResetJobState,
  resetUploadState: defaultResetUploadState,
});

export function createJobRuntimeResetStatePort(
  targetState,
  adapter = defaultResetStateAdapter,
) {
  function resetUpload(options = {}) {
    adapter.resetUploadState(targetState, options);
    adapter.clearAppliedPageRange(targetState);
  }

  return Object.freeze({
    clearAppliedPageRange: () => adapter.clearAppliedPageRange(targetState),
    resetJob: () => adapter.resetJobState(targetState),
    resetSecondary: () => adapter.resetJobSecondaryState(targetState),
    resetUpload,
  });
}
