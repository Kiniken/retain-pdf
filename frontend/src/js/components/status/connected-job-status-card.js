import { createRetainPdfApp } from "../../app-framework/app.js";
import { defineConnectedComponent } from "../../app-framework/connector.js";
import { createStore } from "../../app-framework/store.js";
import { buildRuntimeStatusCardSnapshot } from "../../job-status/status-card-runtime-source.js";

export function createStatusCardSnapshotSource() {
  const store = createStore({
    name: "statusCardSnapshot",
    initialState: {
      snapshot: null,
    },
    actions: {
      setSnapshot(state, snapshot) {
        return {
          ...state,
          snapshot,
        };
      },
    },
  });
  return Object.freeze({
    store,
    stores: {
      statusCard: store,
    },
    sources: {
      statusCard: store,
    },
    snapshotFromSources: ({ statusCard }) => statusCard?.snapshot || null,
    update(snapshot) {
      store.actions.setSnapshot(snapshot);
    },
  });
}

export function createRuntimeStatusCardSource({
  currentJobStore,
  secondaryResourceStore,
  state = null,
  publicErrorText = "",
  finishedAtFallback = "",
} = {}) {
  if (!currentJobStore?.getSnapshot || !currentJobStore?.subscribe) {
    throw new TypeError("createRuntimeStatusCardSource requires currentJobStore.");
  }
  if (!secondaryResourceStore?.getSnapshot || !secondaryResourceStore?.subscribe) {
    throw new TypeError("createRuntimeStatusCardSource requires secondaryResourceStore.");
  }
  const presentationOverrideStore = createStore({
    name: "statusCardPresentationOverride",
    initialState: {
      publicErrorText,
      stagePresentation: null,
    },
    actions: {
      setOverride(currentState, override = {}) {
        return {
          publicErrorText: override.publicErrorText ?? "",
          stagePresentation: override.stagePresentation ?? null,
        };
      },
    },
  });
  return Object.freeze({
    stores: {
      currentJob: currentJobStore,
      presentationOverride: presentationOverrideStore,
      secondaryResources: secondaryResourceStore,
    },
    sources: {
      currentJob: currentJobStore,
      presentationOverride: presentationOverrideStore,
      secondaryResources: secondaryResourceStore,
    },
    snapshotFromSources({ currentJob, presentationOverride, secondaryResources }) {
      return buildRuntimeStatusCardSnapshot({
        currentJob,
        presentationOverride,
        secondaryResources,
        state,
        finishedAtFallback,
      });
    },
    setPresentationOverride(override = {}) {
      presentationOverrideStore.actions.setOverride(override);
    },
    update() {},
  });
}

function createStatusCardHostSource({
  host = null,
  renderSnapshot = null,
} = {}) {
  return {
    render(snapshot) {
      if (!snapshot) {
        return false;
      }
      if (host?.renderSnapshot) {
        host.renderSnapshot(snapshot);
        return true;
      }
      if (!renderSnapshot) {
        return false;
      }
      return renderSnapshot(snapshot);
    },
  };
}

export function createConnectedJobStatusCard({
  host = null,
  renderSnapshot = null,
  snapshotSource = createStatusCardSnapshotSource(),
} = {}) {
  const hostSource = createStatusCardHostSource({ host, renderSnapshot });
  let lastRenderResult = false;
  const component = defineConnectedComponent({
    name: "connected-job-status-card",
    sources: snapshotSource.sources,
    mapState: (snapshots) => snapshotSource.snapshotFromSources(snapshots),
    render(snapshot) {
      lastRenderResult = hostSource.render(snapshot);
    },
  });
  const app = createRetainPdfApp({
    stores: snapshotSource.stores || {},
  });
  let mounted = false;
  let instance = null;

  function mount() {
    if (mounted) {
      return;
    }
    app.start();
    instance = app.mount("connected-job-status-card", component);
    mounted = true;
  }

  function render(snapshot) {
    mount();
    snapshotSource.update(snapshot);
    return lastRenderResult;
  }

  function refresh() {
    mount();
    instance?.update?.();
    return lastRenderResult;
  }

  function unmount() {
    if (!mounted) {
      return;
    }
    app.stop();
    mounted = false;
    instance = null;
  }

  return Object.freeze({
    refresh,
    render,
    unmount,
    source: snapshotSource,
    store: snapshotSource.store,
  });
}

let defaultConnectedStatusCard = null;

export function renderConnectedJobStatusCard(snapshot) {
  if (!defaultConnectedStatusCard) {
    defaultConnectedStatusCard = createConnectedJobStatusCard();
  }
  return defaultConnectedStatusCard.render(snapshot);
}

export function resetConnectedJobStatusCardForTests() {
  defaultConnectedStatusCard?.unmount();
  defaultConnectedStatusCard = null;
}
