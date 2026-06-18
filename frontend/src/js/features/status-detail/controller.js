import { buildStatusDetailSnapshot } from "../../status-detail/snapshot.js";
import {
  rerunCurrentJob as rerunCurrentJobAction,
  syncRerunAction as syncRerunActionState,
} from "./resume-actions.js";
import { createStatusDetailResumeViewPort } from "./resume-view-port.js";
import { createStatusDetailEventCommands } from "./event-commands.js";
import { createStatusDetailOverviewCoordinator } from "./overview-coordinator.js";
import { defaultStatusDetailConfigPort } from "./config-port.js";
import { createStatusDetailNavigationViewPort } from "./navigation-view-port.js";
import { createStatusDetailTranslationTabPort } from "./translation-tab-port.js";

export function mountStatusDetailFeature({
  state,
  apiPrefix,
  fetchJobPayload,
  fetchJobEvents,
  fetchJobDiagnostics,
  fetchResumePlan,
  fetchTranslationDiagnostics,
  fetchTranslationItems,
  fetchTranslationItem,
  replayTranslationItem,
  rerunJob,
  renderJob,
  startPolling,
  setText,
  dialogViewPort,
  runtimePort,
  jobActionResolver = () => ({}),
  navigationViewPort = createStatusDetailNavigationViewPort(),
  resumeViewPort = createStatusDetailResumeViewPort(),
  translationTabPort,
  translationViewPort,
} = {}) {
  const translationTab = translationTabPort || createStatusDetailTranslationTabPort({
    apiPrefix,
    dialogViewPort,
    currentJobId: getCurrentJobId,
    fetchTranslationDiagnostics,
    fetchTranslationItems,
    fetchTranslationItem,
    replayTranslationItem,
    translationViewPort,
  });
  function buildDetailPageUrl(jobId) {
    return defaultStatusDetailConfigPort.buildDetailPageUrl(jobId);
  }

  function getCurrentJobId() {
    return runtimePort.currentJobId();
  }

  function syncRerunAction(statusText = "") {
    return syncRerunActionState({
      ...runtimePort.rerunContext(),
      statusText,
      viewPort: resumeViewPort,
      resolveActions: jobActionResolver,
    });
  }

  async function rerunCurrentJob() {
    await rerunCurrentJobAction({
      rerunContext: runtimePort.rerunContext(),
      rerunJob,
      setText,
      startPolling,
      viewPort: resumeViewPort,
      resolveActions: jobActionResolver,
    });
  }

  function activateDetailTab(name = "overview") {
    navigationViewPort.activateTab(name);
    if (name === "translation") {
      void ensureTranslationData();
      return;
    }
    void ensureOverviewData();
  }

  function openStatusDetailDialog(tabName = "overview") {
    navigationViewPort.openDialog(tabName);
    if (tabName === "translation") {
      void ensureTranslationData();
      return;
    }
    void ensureOverviewData();
  }

  function renderOverviewSnapshot(context) {
    const job = context?.job || null;
    const events = context?.events || null;
    if (!job) {
      return;
    }
    const snapshot = buildStatusDetailSnapshot(job, events, {
      durationOptions: {
        finishedAtFallback: runtimePort.currentJobFinishedAt(),
      },
    });
    dialogViewPort.renderSnapshot(snapshot);
    syncRerunAction();
  }

  const overviewTab = createStatusDetailOverviewCoordinator({
    runtimePort,
    apiPrefix,
    fetchJobPayload,
    fetchJobEvents,
    fetchJobDiagnostics,
    fetchResumePlan,
    renderJob,
    renderOverviewSnapshot,
    setErrorText: (message) => setText?.("error-box", message),
  });

  async function ensureOverviewData({ force = false } = {}) {
    await overviewTab.ensureLoaded({ force });
  }

  async function loadTranslationItem(jobId, itemId) {
    await translationTab.loadItem(jobId, itemId);
  }

  async function replayCurrentItem() {
    await translationTab.replaySelected();
  }

  async function ensureTranslationData({ force = false } = {}) {
    await translationTab.ensureLoaded({ force });
  }

  async function handleTranslationApply() {
    await translationTab.applyFilter(navigationViewPort.readTranslationFilter());
  }

  async function changeTranslationPage(direction) {
    await translationTab.changePage(direction);
  }

  function bindEvents() {
    const commands = createStatusDetailEventCommands({
      openStatusDetailDialog,
      activateDetailTab,
      applyTranslationFilter: handleTranslationApply,
      changeTranslationPage,
      loadTranslationItem,
      replayTranslation: replayCurrentItem,
      rerunCurrentJob,
      currentJobId: getCurrentJobId,
      renderTranslationItemError: (error) => translationTab.renderItemError(error),
      renderTranslationReplayError: (error) => translationTab.renderReplayError(error),
    });
    navigationViewPort.bindEvents({
      commands,
    });
  }

  return {
    activateDetailTab,
    bindEvents,
    openStatusDetailDialog,
    buildDetailPageUrl,
    ensureTranslationData,
    syncRerunAction,
    ensureOverviewData,
  };
}
