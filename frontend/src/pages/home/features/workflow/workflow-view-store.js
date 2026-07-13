// workflow 域视图 store + React viewPort。
//
// mountWorkflowFeature(纯逻辑控制器,原样复用)的 viewPort 契约在这里落到
// store,由 WorkflowPanel/HeroUpload/PageRangeDialog 订阅渲染。
// applyMockUpload/applyWorkflowUpload/setSubmitControls/renderBudgetNote
// 逐条镜像 features/workflow/view.js 的语义(该文件属旧 DOM 视图,禁 import)。
//
// 开发者设置对话框(developer-settings-dialog)是 3b 杂项范围:
// setDeveloperDialog/readDeveloperDialog 先以 store 值往返(不接 DOM 表单),
// 3b React 化该对话框时替换这两个方法的实现即可,控制器无感。

import { createStore } from "../../../../js/app-framework/store.js";

export function createWorkflowViewStore() {
  return createStore({
    name: "homeWorkflowView",
    initialState: {
      submitLabel: "开始翻译",
      submitDisabled: true,
      submitBusy: false,
      pageRangeButtonVisible: true,
      budget: {
        visible: false,
        tone: "",
        message: "",
        blocking: false,
        topUpUrl: "",
      },
      jobWarningVisible: false,
      glossaries: [],
      selectedGlossaryId: "",
      developerDialog: {},
      developerFormState: {},
    },
    actions: {
      patch(currentState, payload = {}) {
        return { ...currentState, ...payload };
      },
    },
  });
}

export function createWorkflowViewFeature({
  store = createWorkflowViewStore(),
  uploadTilePort,
} = {}) {
  const patch = (payload) => store.actions.patch(payload);

  function setSubmitBusy(busy = false) {
    patch({ submitBusy: Boolean(busy) });
  }

  function setSubmitDisabled(disabled = true) {
    patch({ submitDisabled: Boolean(disabled) });
  }

  function selectedGlossaryId() {
    return `${store.getSnapshot().selectedGlossaryId || ""}`.trim();
  }

  function setSelectedGlossaryId(value = "") {
    patch({ selectedGlossaryId: `${value || ""}`.trim() });
  }

  function setJobWarningVisible(visible) {
    patch({ jobWarningVisible: Boolean(visible) });
  }

  // ---- features/workflow/view.js 镜像 ----

  function setSubmitControls({ disabled, label, actionVisible, pageRangeVisible } = {}) {
    patch({
      submitDisabled: Boolean(disabled),
      submitLabel: `${label ?? ""}` || store.getSnapshot().submitLabel,
      pageRangeButtonVisible: Boolean(pageRangeVisible),
    });
    uploadTilePort?.setUploadActionSlotVisible(actionVisible);
  }

  function renderBudgetNote(budget) {
    patch({
      budget: {
        visible: Boolean(budget?.visible),
        tone: `${budget?.tone || ""}`,
        message: `${budget?.message || ""}`,
        blocking: Boolean(budget?.blocking),
        topUpUrl: `${budget?.topUpUrl || ""}`,
      },
    });
  }

  function applyMockUpload({ mockScenario, submitLabel, showPageRangeButton } = {}) {
    uploadTilePort?.setUploadTileLocked({ locked: true, enabled: false });
    uploadTilePort?.setUploadTileText({
      label: "Mock 模式",
      labelTitle: "",
      help: `当前为 mock 模式：${mockScenario || "running"}。不会上传文件，也不会请求真实后端。`,
      status: "Mock 模式已启用，可直接点击开始翻译。",
      statusVisible: true,
    });
    setSubmitControls({
      disabled: false,
      label: submitLabel,
      actionVisible: true,
      pageRangeVisible: showPageRangeButton,
    });
  }

  function applyWorkflowUpload({
    needsUpload,
    uploadReady,
    defaultFileLabel,
    headline,
    renderSourceJobId,
  } = {}) {
    uploadTilePort?.setUploadTileLocked({ locked: !needsUpload, enabled: needsUpload });
    uploadTilePort?.setUploadTileText({
      label: !uploadReady ? (needsUpload ? defaultFileLabel : "复用已有任务产物") : "",
      labelTitle: "",
      help: headline,
      status: !needsUpload
        ? (renderSourceJobId
            ? `当前将复用任务: ${renderSourceJobId}`
            : "请先在开发者设置里填写 Render 源任务 ID。")
        : "",
      statusVisible: !needsUpload ? true : (!uploadReady ? false : null),
    });
  }

  function setDeveloperGlossaryOptions(glossaries = [], selectedId = "") {
    patch({
      glossaries: (Array.isArray(glossaries) ? glossaries : [])
        .map((glossary) => ({
          glossaryId: `${glossary?.glossary_id || ""}`.trim(),
          name: `${glossary?.name || glossary?.glossary_id || ""}`.trim(),
          entryCount: Number.isFinite(Number(glossary?.entry_count))
            ? Number(glossary.entry_count)
            : null,
        }))
        .filter((glossary) => glossary.glossaryId),
      selectedGlossaryId: `${selectedId || ""}`.trim(),
    });
  }

  // ---- 开发者设置对话框(3b 接管点) ----

  function setDeveloperDialog(config = {}) {
    patch({ developerDialog: { ...config } });
  }

  function readDeveloperDialog(defaults = {}) {
    const saved = store.getSnapshot().developerDialog || {};
    return {
      workflow: saved.workflow,
      renderSourceJobId: `${saved.renderSourceJobId || ""}`.trim(),
      model: saved.model || defaults.model,
      baseUrl: saved.baseUrl || defaults.baseUrl,
      glossaryId: selectedGlossaryId() || `${saved.glossaryId || ""}`.trim(),
      workers: saved.workers ?? defaults.workers,
      batchSize: saved.batchSize ?? defaults.batchSize,
      classifyBatchSize: saved.classifyBatchSize ?? defaults.classifyBatchSize,
      compileWorkers: saved.compileWorkers ?? defaults.compileWorkers,
      timeoutSeconds: saved.timeoutSeconds ?? defaults.timeoutSeconds,
    };
  }

  function readDeveloperWorkflow() {
    return store.getSnapshot().developerDialog?.workflow;
  }

  function setDeveloperWorkflowFormState(payload = {}) {
    patch({ developerFormState: { ...payload } });
  }

  const viewPort = {
    applyMockUpload,
    applyWorkflowUpload,
    closeDeveloperDialog: () => {},
    readDeveloperDialog,
    readDeveloperWorkflow,
    renderBudgetNote,
    setDeveloperDialog,
    setDeveloperGlossaryOptions,
    setDeveloperWorkflowFormState,
    setSubmitControls,
  };

  return {
    patch,
    selectedGlossaryId,
    setJobWarningVisible,
    setSelectedGlossaryId,
    setSubmitBusy,
    setSubmitDisabled,
    store,
    viewPort,
  };
}
