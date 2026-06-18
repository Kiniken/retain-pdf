import { createRuntimeStatusCardSource } from "../components/status/connected-job-status-card.js";

export function createPresentationRuntime({
  runtimeState,
  startTicker = () => {},
  stopTicker = () => {},
  getFinishedAt = () => "",
  applyRuntimeSnapshot = () => ({
    events: null,
    job: null,
    jobId: "",
    manifest: null,
    stageActions: null,
  }),
  applySecondaryResources = () => ({
    events: null,
    job: null,
    jobId: "",
    manifest: null,
    stageActions: null,
  }),
  currentJobStore = null,
  currentJobStoreFactory = null,
  secondaryResourceStore = null,
  secondaryResourceStoreFactory = null,
} = {}) {
  const resolvedCurrentJobStore = currentJobStore || currentJobStoreFactory?.(runtimeState) || null;
  const resolvedSecondaryResourceStore = secondaryResourceStore
    || secondaryResourceStoreFactory?.(runtimeState)
    || null;
  let statusCardSource = null;

  function startElapsed() {
    startTicker(runtimeState);
  }

  function stopElapsed() {
    stopTicker(runtimeState);
  }

  function finishedAtFallback() {
    return getFinishedAt(runtimeState);
  }

  function applySnapshot({
    payload,
    eventsPayload = null,
    manifestPayload = null,
    stageActionsPayload = null,
  }) {
    return applyRuntimeSnapshot({
      state: runtimeState,
      payload,
      eventsPayload,
      manifestPayload,
      stageActionsPayload,
    });
  }

  function applySecondary({
    jobId,
    eventsPayload = null,
    manifestPayload = null,
    stageActionsPayload = null,
  }) {
    return applySecondaryResources({
      state: runtimeState,
      jobId,
      eventsPayload,
      manifestPayload,
      stageActionsPayload,
    });
  }

  function createStatusCardSource() {
    if (!statusCardSource) {
      statusCardSource = createRuntimeStatusCardSource({
        currentJobStore: resolvedCurrentJobStore,
        secondaryResourceStore: resolvedSecondaryResourceStore,
        state: runtimeState,
        finishedAtFallback,
      });
    }
    return statusCardSource;
  }

  return Object.freeze({
    applySecondary,
    applySnapshot,
    createStatusCardSource,
    finishedAtFallback,
    stores: Object.freeze({
      currentJob: resolvedCurrentJobStore,
      secondaryResources: resolvedSecondaryResourceStore,
    }),
    startElapsed,
    state: runtimeState,
    stopElapsed,
  });
}
