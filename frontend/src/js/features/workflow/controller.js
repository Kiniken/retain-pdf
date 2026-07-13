import {
  buildDeveloperConfigWithDefaults,
  workflowHeadline as resolveWorkflowHeadline,
  workflowNeedsCredentials as resolveWorkflowNeedsCredentials,
  workflowNeedsUpload as resolveWorkflowNeedsUpload,
  workflowSubmitLabel as resolveWorkflowSubmitLabel,
  workflowUsesRenderStage as resolveWorkflowUsesRenderStage,
} from "./rules.js";
import {
  buildOcrPayload as buildOcrPayloadRequest,
  buildRenderPayload as buildRenderPayloadRequest,
  buildSourcePayload as buildSourcePayloadRequest,
  buildTranslationPayload as buildTranslationPayloadRequest,
} from "./payload.js";
import { createGlossaryOptionsLoader } from "./glossary-options.js";
import {
  buildDeveloperConfigFromDialog,
  defaultDeveloperDialogReadOptions,
} from "./developer-dialog.js";
import { resolveSubmitControlState } from "./submit-controls.js";
import { resolveTranslationBudgetState } from "./budget.js";
import { defaultWorkflowConfigPort } from "./config-port.js";

export function mountWorkflowFeature({
  configPort = defaultWorkflowConfigPort,
  saveDeveloperStoredConfig,
  getDeepSeekBalanceState,
  getDeveloperConfig,
  getUploadState,
  isDesktopMode,
  resetDeveloperConfig,
  setDeveloperConfig,
  defaultModelName,
  defaultModelBaseUrl,
  defaultMineruToken,
  defaultPaddleApiUrl,
  defaultPaddleToken,
  defaultOcrProvider,
  defaultModelApiKey,
  defaultFileLabel = "选择 PDF",
  normalizeWorkflow,
  normalizeMathMode,
  constants,
  currentPageRanges,
  viewPort,
  readSubmitValues = viewPort.readSubmitValues,
  renderPageRangeSummary,
  hasBrowserCredentials,
  updateCredentialGate: updateCredentialGatePort,
  fetchGlossaries,
  apiPrefix,
  setText,
}) {
  const {
    DEFAULT_WORKERS,
    DEFAULT_BATCH_SIZE,
    DEFAULT_CLASSIFY_BATCH_SIZE,
    DEFAULT_COMPILE_WORKERS,
    DEFAULT_TIMEOUT_SECONDS,
    WORKFLOW_BOOK,
    WORKFLOW_TRANSLATE,
    WORKFLOW_RENDER,
  } = constants;

  let refreshSubmitControlsRef = null;
  let applyWorkflowModeRef = null;
  const glossaryOptionsLoader = createGlossaryOptionsLoader({
    fetchGlossaries,
    apiPrefix,
    setDeveloperGlossaryOptions: viewPort.setDeveloperGlossaryOptions,
    setText,
    getDefaultSelectedId: () => developerConfigWithDefaults().glossaryId,
  });

  function developerConfigWithDefaults() {
    return buildDeveloperConfigWithDefaults({
      saved: getDeveloperConfig(),
      normalizeWorkflow,
      normalizeMathMode,
      defaults: {
        workers: DEFAULT_WORKERS,
        batchSize: DEFAULT_BATCH_SIZE,
        classifyBatchSize: DEFAULT_CLASSIFY_BATCH_SIZE,
        compileWorkers: DEFAULT_COMPILE_WORKERS,
        timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
      },
      defaultModelName,
      defaultModelBaseUrl,
    });
  }

  function syncDeveloperDialogFromState() {
    const config = developerConfigWithDefaults();
    glossaryOptionsLoader.applyOptions(config.glossaryId);
    viewPort.setDeveloperDialog(config);
    updateDeveloperWorkflowFormState();
    void loadGlossaryOptions();
  }

  function currentWorkflow() {
    return developerConfigWithDefaults().workflow;
  }

  function currentRenderSourceJobId() {
    return developerConfigWithDefaults().renderSourceJobId;
  }

  function workflowNeedsUpload(workflow = currentWorkflow()) {
    return resolveWorkflowNeedsUpload(workflow, constants);
  }

  function workflowNeedsCredentials(workflow = currentWorkflow()) {
    return resolveWorkflowNeedsCredentials(workflow, constants);
  }

  function workflowUsesRenderStage(workflow = currentWorkflow()) {
    return resolveWorkflowUsesRenderStage(workflow, constants);
  }

  function workflowSubmitLabel(workflow = currentWorkflow()) {
    return resolveWorkflowSubmitLabel(workflow, constants);
  }

  function workflowUsesTranslation(workflow = currentWorkflow()) {
    return workflow === WORKFLOW_BOOK || workflow === WORKFLOW_TRANSLATE;
  }

  function workflowHeadline(workflow = currentWorkflow()) {
    return resolveWorkflowHeadline(workflow, constants);
  }

  function updateDeveloperWorkflowFormState() {
    const workflow = normalizeWorkflow(viewPort.readDeveloperWorkflow());
    viewPort.setDeveloperWorkflowFormState({
      workflow,
      workflowRender: WORKFLOW_RENDER,
      workflowTranslate: WORKFLOW_TRANSLATE,
    });
  }

  function refreshSubmitControls() {
    const workflow = currentWorkflow();
    const uploadState = getUploadState();
    const budget = currentBudgetState(workflow);
    const submitState = resolveSubmitControlState({
      workflow,
      isMock: configPort.isMock(),
      desktopMode: isDesktopMode(),
      uploadId: uploadState.uploadId,
      renderSourceJobId: currentRenderSourceJobId(),
      hasBrowserCredentials: Boolean(hasBrowserCredentials?.()),
      budgetBlocking: budget.blocking,
      workflowNeedsUpload,
      workflowNeedsCredentials,
      workflowSubmitLabel,
    });
    viewPort.renderBudgetNote(budget);
    viewPort.setSubmitControls(submitState);
  }

  function currentBudgetState(workflow = currentWorkflow()) {
    const uploadState = getUploadState();
    const balanceState = getDeepSeekBalanceState();
    return resolveTranslationBudgetState({
      pageRanges: currentPageRanges(),
      uploadedPageCount: uploadState.uploadedPageCount,
      balanceCny: balanceState.balanceCny,
      balanceChecked: balanceState.balanceChecked,
      needsTranslation: workflowNeedsUpload(workflow) && workflowUsesTranslation(workflow) && Boolean(uploadState.uploadId),
    });
  }

  function updateCredentialGate() {
    if (configPort.isMock()) {
      return;
    }
    updateCredentialGatePort?.({
      workflowNeedsCredentials: () => workflowNeedsCredentials(currentWorkflow()),
      workflowNeedsUpload: () => workflowNeedsUpload(currentWorkflow()),
      refreshSubmitControls,
    });
  }

  function applyWorkflowMode() {
    const workflow = currentWorkflow();
    const needsUpload = workflowNeedsUpload(workflow);
    const showPageRangeButton = workflowNeedsUpload(workflow);
    if (configPort.isMock()) {
      viewPort.applyMockUpload({
        mockScenario: configPort.mockScenario(),
        submitLabel: workflowSubmitLabel(workflow),
        showPageRangeButton,
      });
      renderPageRangeSummary();
      updateCredentialGate();
      return;
    }
    const uploadState = getUploadState();
    viewPort.applyWorkflowUpload({
      needsUpload,
      uploadReady: Boolean(uploadState.uploadId),
      defaultFileLabel,
      headline: workflowHeadline(workflow),
      renderSourceJobId: currentRenderSourceJobId(),
    });
    renderPageRangeSummary();
    refreshSubmitControls();
    updateCredentialGate();
    void loadGlossaryOptions();
  }

  function saveDeveloperDialog() {
    const currentConfig = developerConfigWithDefaults();
    const values = viewPort.readDeveloperDialog(defaultDeveloperDialogReadOptions({
      defaultModelName,
      defaultModelBaseUrl,
      defaults: {
        workers: DEFAULT_WORKERS,
        batchSize: DEFAULT_BATCH_SIZE,
        classifyBatchSize: DEFAULT_CLASSIFY_BATCH_SIZE,
        compileWorkers: DEFAULT_COMPILE_WORKERS,
        timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
      },
    }));
    setDeveloperConfig(buildDeveloperConfigFromDialog({
      currentConfig,
      values,
      normalizeWorkflow,
    }));
    viewPort.setDeveloperDialog(developerConfigWithDefaults());
    void saveDeveloperStoredConfig(getDeveloperConfig());
    applyWorkflowMode();
    viewPort.closeDeveloperDialog();
  }

  function resetDeveloperDialog() {
    resetDeveloperConfig();
    void saveDeveloperStoredConfig({});
    syncDeveloperDialogFromState();
    applyWorkflowMode();
  }

  function currentWorkflowSubmitValues() {
    return readSubmitValues({
      defaultOcrProvider: defaultOcrProvider(),
      defaultPaddleToken: defaultPaddleToken(),
      defaultMineruToken: defaultMineruToken(),
      defaultModelApiKey: defaultModelApiKey(),
    });
  }

  function buildOcrPayload(pageRanges, submitValues = currentWorkflowSubmitValues()) {
    return buildOcrPayloadRequest({
      pageRanges,
      ocrProvider: submitValues.ocrProvider,
      ocrToken: submitValues.ocrToken,
      defaultPaddleApiUrl,
      constants,
    });
  }

  function buildTranslationPayload(developerConfig, submitValues = currentWorkflowSubmitValues()) {
    return buildTranslationPayloadRequest({
      developerConfig,
      modelApiKey: submitValues.modelApiKey,
      selectedGlossaryId: submitValues.selectedGlossaryId,
      constants,
    });
  }

  async function loadGlossaryOptions({ force = false, selectedId = "" } = {}) {
    return glossaryOptionsLoader.loadGlossaryOptions({ force, selectedId });
  }

  function buildRenderPayload(developerConfig) {
    return buildRenderPayloadRequest({
      developerConfig,
      constants,
    });
  }

  function collectRunPayload() {
    const pageRanges = currentPageRanges();
    const developerConfig = developerConfigWithDefaults();
    const workflow = developerConfig.workflow;
    const uploadState = getUploadState();
    const submitValues = currentWorkflowSubmitValues();
    const payload = {
      workflow,
      source: buildSourcePayloadRequest({
        workflow,
        developerConfig,
        uploadId: uploadState.uploadId,
        workflowNeedsUpload,
      }),
      runtime: {
        job_id: "",
        timeout_seconds: developerConfig.timeoutSeconds,
      },
    };
    if (workflow === WORKFLOW_BOOK || workflow === WORKFLOW_TRANSLATE) {
      payload.ocr = buildOcrPayload(pageRanges, submitValues);
      payload.translation = buildTranslationPayload(developerConfig, submitValues);
    }
    if (workflowUsesRenderStage(workflow)) {
      payload.render = buildRenderPayload(developerConfig);
    }
    return payload;
  }

  return {
    applyWorkflowMode,
    collectRunPayload,
    currentRenderSourceJobId,
    currentWorkflow,
    currentBudgetState,
    developerConfigWithDefaults,
    loadGlossaryOptions,
    refreshSubmitControls,
    resetDeveloperDialog,
    saveDeveloperDialog,
    syncDeveloperDialogFromState,
    updateCredentialGate,
    updateDeveloperWorkflowFormState,
    workflowNeedsCredentials,
    workflowNeedsUpload,
  };
}
