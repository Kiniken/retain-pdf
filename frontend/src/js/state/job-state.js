export function createJobState() {
  return {
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
  };
}

export function resetJobState(target) {
  Object.assign(target, createJobState());
  syncSecondaryResourceReset(target, { preserveInFlight: false });
}

export function resetJobSecondaryState(target) {
  Object.assign(target, {
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
  syncSecondaryResourceReset(target, { preserveInFlight: false });
}

function syncSecondaryResourceReset(target, options) {
  const symbols = Object.getOwnPropertySymbols(target || {});
  const secondaryStoreSymbol = symbols.find((symbol) => String(symbol) === "Symbol(retainpdf.secondaryResourceStore)");
  const secondaryStore = secondaryStoreSymbol ? target[secondaryStoreSymbol] : null;
  if (!secondaryStore?.reset) {
    return;
  }
  const emptyRecord = {
    payload: null,
    jobId: "",
    fetchedAt: 0,
    inFlight: false,
  };
  const next = {
    events: { ...emptyRecord, inFlight: options?.preserveInFlight ? Boolean(target.currentJobEventsFetchInFlight) : false },
    manifest: { ...emptyRecord, inFlight: options?.preserveInFlight ? Boolean(target.currentJobManifestFetchInFlight) : false },
    stageActions: { ...emptyRecord, inFlight: options?.preserveInFlight ? Boolean(target.currentJobStageActionsFetchInFlight) : false },
  };
  secondaryStore.reset(next);
}
