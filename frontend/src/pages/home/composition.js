// home 页组合根(Phase 3a:app-shell / upload / workflow 三域 + 事件桥雏形)。
//
// 装配原则(总计划「状态策略」):
// - 纯逻辑控制器(mountUploadFeature / mountWorkflowFeature / idle-reset)
//   原样复用,只把 viewPort 换成 store 驱动的 React 实现;
// - 定时器/网络全部留在 React 之外;composition 为模块级单例,entry.jsx
//   先 createHomeComposition() + initialize() 再 render(与 StrictMode 解耦);
// - 227 个 bootstrap 端口文件在这里溶解为组合根字面量。
//
// 3b 接入点(见文末 bridge 与 features 注册表):
// - mountJobRuntimeFeature:renderJob/renderJobSecondaryPatch 由 statusCard
//   presenter 提供;setText/setWorkflowSections/setLinearProgress/
//   updateActionButtons/resetUpload*/applyWorkflowMode/updateJobWarning
//   直接取自本文件 bridge(蓝图 §4 的回调接口,3a 已定型);
// - mountRecentJobsFeature:viewPort 换 recent-jobs-react-port,statePort/轮询引擎
//   原样;bindings.js 依赖的 open/close-translation-workflow 事件本组合根
//   已保证 dispatch(translation-workflow-dialog-runtime.js)。

import { API_PREFIX } from "../../js/config/api-constants.js";
import { createStore } from "../../js/app-framework/store.js";
import { APP_EVENTS } from "../../js/contracts/app-contract.js";
import { DEFAULT_MODEL_VERSION } from "../../js/config/model-constants.js";
import {
  apiBase,
  defaultMineruToken,
  defaultModelApiKey,
  defaultModelBaseUrl,
  defaultModelName,
  defaultOcrProvider,
  defaultPaddleApiUrl,
  defaultPaddleToken,
} from "../../js/config/runtime.js";
import {
  DEFAULT_FILE_LABEL,
  FRONT_MAX_BYTES,
  FRONT_MAX_PAGE_COUNT,
} from "../../js/config/upload-constants.js";
import {
  loadBrowserStoredConfig,
  loadDeveloperStoredConfig,
  saveBrowserStoredConfig,
  savePersistedBrowserStoredConfig,
  savePersistedDeveloperStoredConfig,
} from "../../js/config/persisted-config.js";
import {
  createDeveloperState,
  getDeveloperConfig,
  resetDeveloperConfig,
  setDeveloperConfig,
} from "../../js/state/developer-state.js";
import {
  createDesktopState,
  isDesktopMode,
  setDesktopConfigured,
  setDesktopMode,
} from "../../js/state/desktop-state.js";
import { createHomeStatePort } from "../../js/features/home/state.js";
import { createUploadStatePort } from "../../js/features/upload/state.js";
import { defaultCredentialsStatePort } from "../../js/features/credentials/default-state-port.js";
import { readHiddenCredentialDomInputs } from "../../js/features/credentials/hidden-input-dom-port.js";
import { createCredentialRuntimeEnvPort } from "../../js/features/credentials/runtime-env-port.js";
import { mountBrowserCredentialsFeature } from "../../js/features/credentials/browser.js";
import {
  validateDeepSeekToken,
  validateMineruToken,
  validatePaddleToken,
  queryDeepSeekBalance,
} from "../../js/api/providers.js";
import { createTranslationWorkflowDialogStatePort } from "../../js/features/translation-workflow-dialog/state.js";
import { mountUploadFeature } from "../../js/features/upload/controller.js";
import { mountWorkflowFeature } from "../../js/features/workflow/controller.js";
// ---- 3b:app-actions 域(提交流程;纯逻辑 controller.js/submit-flow.js/
// config-port.js/job-snapshot-port.js/runtime-env-port.js/upload-state-port.js
// 原样复用;view.js/action-view-port.js 判死,不 import——见下方装配块的
// appActionsViewPort 字面量替代实现) ----
import { mountAppActionsFeature } from "../../js/features/app-actions/controller.js";
import { defaultAppActionsConfigPort } from "../../js/features/app-actions/config-port.js";
import { createAppActionsRuntimeEnvPort } from "../../js/features/app-actions/runtime-env-port.js";
import { submitJobRequest } from "../../js/api/jobs-submit.js";
import { openDesktopOutputDirectory } from "../../js/config/desktop-persistence.js";
import { initializeIdleAppView } from "../../js/features/app-shell/idle-reset.js";
import { defaultAppShellConfigPort } from "../../js/features/app-shell/config-port.js";
import { defaultWorkflowConfigPort } from "../../js/features/workflow/config-port.js";
import { countPdfPages } from "../../js/features/upload/pdf-page-count.js";
import { collectUploadFormData } from "../../js/features/upload/form-data.js";
import { submitUploadRequest as submitUploadRequestHttp } from "../../js/api/http.js";
import {
  fetchGlossaries as fetchGlossariesApi,
  fetchGlossary as fetchGlossaryApi,
  createGlossary as createGlossaryApi,
  updateGlossary as updateGlossaryApi,
  deleteGlossary as deleteGlossaryApi,
  exportGlossaryCsv as exportGlossaryCsvApi,
  parseGlossaryCsv as parseGlossaryCsvApi,
} from "../../js/api/glossaries.js";
import { normalizeJobPayload } from "../../js/job/normalize.js";
import { summarizeStatus } from "../../js/job/diagnostics.js";
import { buildJobWarningViewModel } from "../../js/job/workflow-visibility-view-model.js";
import { isJobTerminal, isTerminalStatus } from "../../js/job/core.js";
import {
  resolveSourcePdfDownloadName,
  resolveTranslatedPdfDownloadName,
} from "../../js/job/artifacts.js";

// ---- dialogs 蓝图 §7:artifact-downloads 域(document 级委托点击行为
// hook;纯逻辑 controller.js/download-actions.js/runtime-port.js 原样复用,
// 只把 viewPort 换成 store 驱动的 React 实现;详见下方装配块与
// state/artifact-download-busy-store.js 头注释) ----
import { mountArtifactDownloadsFeature } from "../../js/features/artifact-downloads/controller.js";
import { createArtifactDownloadsRuntimePort } from "../../js/features/artifact-downloads/runtime-port.js";
import { PROTECTED_ARTIFACT_SELECTOR } from "../../js/contracts/download-action-contract.js";
import { fetchProtected } from "../../js/api/http.js";

// ---- 3b:glossaries 域(GlossariesDialog;纯逻辑控制器原样复用;蓝图 §3) ----
import { mountGlossariesFeature } from "../../js/features/glossaries/controller.js";

// ---- 3b:app-update 域(AppUpdateBanner;纯逻辑控制器原样复用;蓝图 §5) ----
import { mountAppUpdateFeature } from "../../js/features/app-update/controller.js";
import { fetchLatestGithubRelease, normalizeReleaseInfo } from "../../js/features/app-update/github-release.js";
import { defaultUpdateCachePort } from "../../js/features/app-update/state.js";

// ---- dialogs 蓝图 §4:ReaderDialog 域(iframe 宿主;纯逻辑 routing.js
// 原样复用,只把开合状态换成 dialog-store 驱动的 React 实现) ----
import { requestedReaderJobIdFromLocation } from "../../js/features/reader-dialog/routing.js";

// ---- 3b:recent-jobs + job-runtime 引擎(纯逻辑,原样 import 并 mount;蓝图 §1) ----
import { mountJobRuntimeFeature } from "../../js/features/job-runtime/controller.js";
import {
  currentJobStoreFor,
  currentJobFinishedAt,
  currentJobId as currentJobIdFor,
  syncCurrentJobSnapshot,
} from "../../js/features/job-runtime/current-job-state.js";
import { secondaryResourceStoreFor } from "../../js/features/job-runtime/secondary-resource-cache.js";
import { readActiveJobId } from "../../js/features/job-runtime/active-job-storage.js";

import { mountRecentJobsFeature } from "../../js/features/recent-jobs/controller.js";
import { createRecentJobsStatePort } from "../../js/features/recent-jobs/state.js";
import { createRecentJobActions } from "../../js/features/recent-jobs/actions.js";
import { createRecentJobsRuntimePort } from "../../js/features/recent-jobs/job-runtime-port.js";
import { createRecentJobsReaderPort } from "../../js/features/recent-jobs/reader-port.js";
import { createRecentJobsNavigationPort } from "../../js/features/recent-jobs/navigation-port.js";
import { createRecentJobsLibraryRefreshPort } from "../../js/features/recent-jobs/library-refresh-port.js";
import { adaptJobStageSnapshot } from "../../js/job-status/job-stage-contract-adapter.js";

import { fetchJobList, fetchJobPayload } from "../../js/api/jobs-query.js";
import { fetchLibraryBookList, deleteLibraryBook } from "../../js/api/library-books.js";
import { fetchDocumentList, translateDocument } from "../../js/api/documents.js";
import { createDocumentLibraryResource } from "../../js/features/documents-library/document-library-resource.js";
import { fetchJobEvents } from "../../js/api/jobs-events.js";
import { fetchJobArtifactsManifest } from "../../js/api/jobs-artifacts.js";
import {
  fetchJobStageActions,
  retryJobStage,
  fetchJobDiagnostics,
  fetchResumePlan,
  rerunJob,
} from "../../js/api/jobs-actions.js";
import { submitJson, buildJobDetailEndpoint, buildApiEndpoint } from "../../js/api/http.js";
import {
  fetchTranslationDiagnostics,
  fetchTranslationItems,
  fetchTranslationItem,
  replayTranslationItem,
} from "../../js/api/translation-debug.js";

import { createHomeTextStore } from "./state/text-store.js";
import { createArtifactDownloadBusyStore } from "./state/artifact-download-busy-store.js";
import { createUploadViewFeature } from "./features/upload/upload-view-store.js";
import { createWorkflowViewFeature } from "./features/workflow/workflow-view-store.js";
import { createStatusAreaFeature } from "./features/status/status-area.js";
import { createCredentialsViewFeature } from "./features/credentials/credentials-view-store.js";
import { createCredentialsDialogStore } from "./features/credentials/credentials-dialog-store.js";
import { createSettingsHubDialogStore } from "./features/settings/settings-hub-dialog-store.js";
import { createGlossariesViewFeature } from "./features/glossaries/glossaries-store.js";
import { createGlossariesDialogStore } from "./features/glossaries/glossaries-dialog-store.js";
import { createCollectionsController } from "./features/collections/controller.js";
import { createCollectionManageDialogStore } from "./features/collections/collection-manage-dialog-store.js";
import { createAppUpdateViewFeature } from "./features/app-update/app-update-store.js";
import { createStatusCardStore, createStatusCardPresenter } from "./features/status/status-card-store.js";
import { createRecentJobsReactViewPort } from "./features/library/recent-jobs-react-port.js";
import { createStatusDetailStore } from "./features/status-detail/status-detail-store.js";
import { createStatusDetailDialogStore } from "./features/status-detail/status-detail-dialog-store.js";
import { createStatusDetailRuntimePort } from "./features/status-detail/status-detail-runtime-port.js";
import { createStatusDetailController } from "./features/status-detail/status-detail-controller.js";
import { createReaderDialogStore } from "./features/reader/reader-dialog-store.js";
import {
  createTranslationWorkflowDialogRuntime,
} from "./features/workflow/translation-workflow-dialog-runtime.js";
import {
  normalizeMathMode,
  normalizeWorkflow,
  workflowConstants,
} from "./features/workflow/workflow-config.js";

function safeLoad(loader, fallback) {
  try {
    return loader();
  } catch {
    return fallback;
  }
}

export function createHomeComposition({
  documentRef = globalThis.document,
  // 测试注入口(jsdom 下隔离网络/localStorage);生产走默认实现
  fetchGlossaries = fetchGlossariesApi,
  submitUploadRequest = submitUploadRequestHttp,
  loadPersistedDeveloperConfig = () => safeLoad(loadDeveloperStoredConfig, {}),
  loadPersistedBrowserConfig = () => safeLoad(loadBrowserStoredConfig, {}),
  // credentials 域网络调用注入口(jsdom 测试没有 fetch/isMockMode 的 ?mock=
  // URL 参数,必须能整体替换,不然校验/保存流程在测试里会真去发请求)。
  validateOcrToken: validateOcrTokenOverride = null,
  validateDeepSeekToken: validateDeepSeekTokenOverride = validateDeepSeekToken,
  queryDeepSeekBalance: queryDeepSeekBalanceOverride = queryDeepSeekBalance,
  checkApiConnectivity: checkApiConnectivityOverride = null,
  saveDesktopConfig: saveDesktopConfigOverride = null,
  // 测试注入口:桌面模式分支(credentials 保存两分支之一)在 jsdom 下没有真实
  // desktop bridge,只能靠这个显式开关驱动 runtimeEnvPort.isDesktopMode()。
  initialDesktopMode = false,
  // glossaries 域网络调用注入口(蓝图 §3;镜像 credentials 的做法,测试可整体
  // 替换,不然 reload/save/delete/export/导入解析在 jsdom 下会真去发请求)。
  fetchGlossary: fetchGlossaryOverride = fetchGlossaryApi,
  createGlossary: createGlossaryOverride = createGlossaryApi,
  updateGlossary: updateGlossaryOverride = updateGlossaryApi,
  deleteGlossary: deleteGlossaryOverride = deleteGlossaryApi,
  exportGlossaryCsv: exportGlossaryCsvOverride = exportGlossaryCsvApi,
  parseGlossaryCsv: parseGlossaryCsvOverride = parseGlossaryCsvApi,
  // app-update 域(蓝图 §5)测试注入口:fetchLatestRelease/appUpdateCachePort
  // 覆盖网络与缓存,行为与 credentials 的校验注入口同源。
  fetchLatestRelease: fetchLatestReleaseOverride = fetchLatestGithubRelease,
  appUpdateCachePort: appUpdateCachePortOverride = defaultUpdateCachePort,
  // mountAppUpdateFeature 内部用 window.setTimeout 无条件发起 GitHub 请求
  // (真实网络,~秒级延迟)。composition 在测试里被大量构造(home-app-component/
  // credentials-dialog-component 等与 app-update 无关的测试也会创建它),默认
  // 关闭自动检查,避免把整个测试套件拖成"真连 GitHub"——production 由
  // entry.jsx 显式传 true 打开(与旧世界 bootstrap/core-app-update-runtime-port.js
  // 的 isAppUpdateEnabled port 同源判断,只是默认方向相反、显式开关挪到调用侧)。
  appUpdateAutoCheckEnabled = false,
} = {}) {
  // ---- 特性注册表:3b 往这里挂 browserCredentialsFeature / jobRuntimeFeature /
  //      recentJobsFeature / statusDetailFeature,下方的懒回调即刻生效 ----
  const features = {};

  // ---- 纯状态(旧全局 state 溶解为组合根局部) ----
  const legacyState = { ...createDeveloperState(), ...createDesktopState() };
  setDeveloperConfig(legacyState, loadPersistedDeveloperConfig());
  setDesktopMode(legacyState, initialDesktopMode);

  const homeStatePort = createHomeStatePort({}, { eventTarget: documentRef });
  const uploadStatePort = createUploadStatePort();
  // defaultCredentialsStatePort 是全局单例(default-state-port.js)——蓝图 §2
  // 铁律:必须原样复用,不能各域各建一份,否则隐藏 input 桥接(4 个
  // ocr_provider/mineru_token/paddle_token/api_key)会读到不同的 store,
  // 造成"设置里填了 token,上传时读不到"的静默失败(风险 1)。composition
  // 只在这里把持久化的浏览器凭据灌进去一次;单例本身随模块常驻,不随
  // composition 实例重建(测试之间的隔离靠每次都显式 setCredentials 覆盖)。
  const credentialsStatePort = defaultCredentialsStatePort;
  credentialsStatePort.setCredentials(loadPersistedBrowserConfig());

  // ---- 视图 store 层(React 订阅面) ----
  const textStore = createHomeTextStore();
  const uploadView = createUploadViewFeature();
  const workflowView = createWorkflowViewFeature({ uploadTilePort: uploadView.uploadTilePort });
  const statusArea = createStatusAreaFeature({ documentRef });

  const setText = textStore.setText;

  // ---- 对话框状态与事件桥 ----
  const dialogStatePort = createTranslationWorkflowDialogStatePort({ homeStatePort });
  const workflowDialog = createTranslationWorkflowDialogRuntime({
    dialogStatePort,
    statusAreaPort: statusArea.statusAreaPort,
    uploadSessionPort: {
      resetUploadSession: () => features.uploadFeature?.resetUploadSession?.(),
    },
    documentRef,
  });

  // ---- 3b 回调桥(蓝图 §4;mountJobRuntimeFeature 的 payload 从这里取) ----
  const bridge = {
    setText,
    // 状态区可见性(hasJob → #status-section 显隐 + statusAreaVisibilityChanged)
    setWorkflowSections: (job = null) => statusArea.setWorkflowSections(job),
    updateJobWarning: (status) => workflowView.setJobWarningVisible(
      buildJobWarningViewModel(status).active,
    ),
    resetUploadProgress: () => uploadView.resetUploadProgress(),
    resetUploadedFile: () => {
      // 旧 ui/job-actions.js:上传态归零 + 视图复位 + submit 置灰
      uploadStatePort.reset();
      workflowView.setSubmitDisabled(true);
      uploadView.resetUploadedFileView();
    },
    applyWorkflowMode: () => features.workflowFeature?.applyWorkflowMode(),
    renderPageRangeSummary: () => features.uploadFeature?.renderPageRangeSummary(),
    setSubmitBusy: (busy) => workflowView.setSubmitBusy(busy),
    // ---- 以下为 3b 覆写点(状态卡/事件流/详情页签就位后替换实现) ----
    setLinearProgress: () => {},
    updateActionButtons: () => {},
    resetEventsList: () => {},
    // 旧世界语义(runtime-reset.js/idle-reset.js):job 回到 idle 态时清空详情
    // 弹窗残留字段 + tab 复位到 overview。React 世界数据是整份 store 快照
    // (不是逐字段 textStore 写入),等价动作是清空 overview/translation 两段;
    // 不强制开合对话框(仅在已打开时把 tab 拨回 overview)。3b 占位在此接线,
    // statusDetailDialogStore/statusDetailStore 定义于下方 job-runtime 装配块,
    // 用惰性闭包读取(bridge 对象先于两者构造)。
    activateDetailTab: (name = "overview") => {
      statusDetailStore?.actions?.resetOverview();
      statusDetailStore?.actions?.resetTranslation();
      if (statusDetailDialogStore?.getState().open) {
        statusDetailDialogStore.open({ activeTab: name || "overview" });
      }
    },
    // app-actions 提交流程(3b):submitForm(event) → submit-flow.js。
    // appActionsFeature 在本函数体内同步构造(见下方装配块,不像
    // jobRuntimeFeature 那样延后到 initialize()),真正点击提交按钮时必然已
    // 就绪;这里仍显式 preventDefault 兜底,避免极端情况下表单原生提交刷新页面。
    submitForm: (event) => {
      event?.preventDefault?.();
      return features.appActionsFeature?.submitForm(event);
    },
  };

  // ---- workflow 特性(纯逻辑控制器原样复用) ----
  const constants = workflowConstants();
  function readSubmitValues({
    defaultOcrProvider: ocrProviderFallback,
    defaultPaddleToken: paddleTokenFallback,
    defaultMineruToken: mineruTokenFallback,
    defaultModelApiKey: modelApiKeyFallback,
  } = {}) {
    const credentials = credentialsStatePort.getCredentials?.() || {};
    const ocrProvider = credentials.ocrProvider || ocrProviderFallback;
    const ocrToken = credentialsStatePort.getOcrToken?.({
      providerId: ocrProvider,
      defaultPaddleToken: () => paddleTokenFallback || "",
      defaultMineruToken: () => mineruTokenFallback || "",
    }) || "";
    return {
      ocrProvider,
      ocrToken,
      modelApiKey: credentials.modelApiKey || modelApiKeyFallback,
      selectedGlossaryId: workflowView.selectedGlossaryId(),
    };
  }

  features.workflowFeature = mountWorkflowFeature({
    configPort: defaultWorkflowConfigPort,
    saveDeveloperStoredConfig: savePersistedDeveloperStoredConfig,
    getDeepSeekBalanceState: () => credentialsStatePort.getDeepSeekBalanceState(),
    getDeveloperConfig: () => getDeveloperConfig(legacyState),
    getUploadState: uploadStatePort.getSnapshot,
    isDesktopMode: () => isDesktopMode(legacyState),
    resetDeveloperConfig: () => resetDeveloperConfig(legacyState),
    setDeveloperConfig: (config) => setDeveloperConfig(legacyState, config),
    defaultModelName,
    defaultModelBaseUrl,
    defaultMineruToken,
    defaultPaddleApiUrl,
    defaultPaddleToken,
    defaultOcrProvider,
    defaultModelApiKey,
    defaultFileLabel: DEFAULT_FILE_LABEL,
    normalizeWorkflow,
    normalizeMathMode,
    constants,
    currentPageRanges: () => features.uploadFeature?.currentPageRanges() || "",
    viewPort: workflowView.viewPort,
    readSubmitValues,
    renderPageRangeSummary: () => features.uploadFeature?.renderPageRangeSummary(),
    // credentials 域 3b 接线:就位前无浏览器凭据,凭据门先不亮
    hasBrowserCredentials: () => Boolean(features.browserCredentialsFeature?.hasBrowserCredentials?.()),
    updateCredentialGate: (options) => features.browserCredentialsFeature?.updateCredentialGate?.(options),
    fetchGlossaries,
    apiPrefix: API_PREFIX,
    setText,
  });

  // ---- upload 特性(纯逻辑控制器原样复用) ----
  features.uploadFeature = mountUploadFeature({
    uploadStatePort,
    // 必须显式传入 store 驱动的 viewPort:controller.js 的默认参数会落到
    // createUploadViewPort()(旧世界 features/upload/view.js 直接查 DOM),
    // 遗漏会导致 React 树里的 uploadView store 收不到 constrainPageRanges/
    // writePageRanges 等写入,表现为受控 input 的值被静默吞掉。
    viewPort: uploadView.viewPort,
    apiBase,
    apiPrefix: API_PREFIX,
    frontMaxBytes: FRONT_MAX_BYTES,
    frontMaxPageCount: FRONT_MAX_PAGE_COUNT,
    countPdfPages,
    defaultFileLabel: DEFAULT_FILE_LABEL,
    collectUploadFormData,
    submitUploadRequest,
    resetUploadedFile: bridge.resetUploadedFile,
    resetUploadProgress: bridge.resetUploadProgress,
    setUploadProgress: uploadView.setUploadProgress,
    clearFileInputValue: uploadView.clearFileInputValue,
    setText,
    applyWorkflowMode: () => features.workflowFeature.applyWorkflowMode(),
    refreshSubmitControls: () => features.workflowFeature.refreshSubmitControls(),
    // TODO(3b credentials):接 browserCredentialsFeature.refreshDeepSeekBalance;
    // 传 null 时控制器跳过余额检测(上传完成即就绪),与旧世界差异仅此一处中间态
    refreshDeepSeekBalance: null,
    workflowNeedsUpload: (workflow) => features.workflowFeature.workflowNeedsUpload(workflow),
  });

  // ---- credentials 特性(CredentialsDialog 域;纯逻辑控制器 browser.js 原样
  //      复用,只把 viewPort/dialogElementsPort 换成 store 驱动的 React 实现) ----
  const credentialsDialogStore = createCredentialsDialogStore();
  const settingsHubDialogStore = createSettingsHubDialogStore();
  const credentialsView = createCredentialsViewFeature({ dialogStore: credentialsDialogStore });

  function saveCredentialTaskOptions(options = {}) {
    // 镜像旧 credential-task-options-mount-port.js 的 saveDeveloperTaskOptions
    // 语义,落在本组合根的本地 legacyState(不依赖旧全局 state/store.js 单例)。
    setDeveloperConfig(legacyState, { ...getDeveloperConfig(legacyState), ...options });
    void savePersistedDeveloperStoredConfig(getDeveloperConfig(legacyState));
  }

  async function saveDesktopCredentialConfig(mineruToken, modelApiKey, afterSave, extraBrowserConfig = {}) {
    // 桌面模式凭据持久化(镜像 desktop/index.js 的 saveDesktopConfig,但落在
    // 本组合根的本地 legacyState/credentialsStatePort,不依赖旧全局
    // state/store.js 单例——那个模块还耦合 $() DOM 查询与旧 bootstrap 状态袋,
    // 不适合从 React 世界直接 import)。
    const persisted = await savePersistedBrowserStoredConfig({
      ...extraBrowserConfig,
      mineruToken,
      modelApiKey,
    });
    setDeveloperConfig(legacyState, persisted.developerConfig || getDeveloperConfig(legacyState));
    credentialsStatePort.setCredentials(persisted.browserConfig || {});
    if (extraBrowserConfig?.markConfigured) {
      setDesktopConfigured(legacyState, true);
    }
    await afterSave?.();
    return persisted;
  }

  async function validateCredentialOcrToken(apiPrefixArg, providerId, token) {
    // 镜像旧 bootstrap/credential-provider-actions.js 的 payload 形状
    // (validateOcrTokenForProvider),真实校验接口地址与 model_version 一致。
    if (providerId === "paddle") {
      return validatePaddleToken(apiPrefixArg, {
        paddle_token: token,
        base_url: "https://paddleocr.aistudio-app.com",
      });
    }
    return validateMineruToken(apiPrefixArg, {
      mineru_token: token,
      base_url: "https://mineru.net",
      model_version: DEFAULT_MODEL_VERSION,
    });
  }

  features.browserCredentialsFeature = mountBrowserCredentialsFeature({
    apiPrefix: API_PREFIX,
    state: {},
    credentialsStatePort,
    applyHiddenCredentialInputs: credentialsStatePort.setCredentials,
    defaultMineruToken,
    defaultPaddleToken,
    defaultModelApiKey,
    defaultModelBaseUrl,
    getTaskOptions: () => features.workflowFeature?.developerConfigWithDefaults?.() || {},
    saveTaskOptions: saveCredentialTaskOptions,
    saveBrowserStoredConfig,
    readHiddenCredentialInputs: readHiddenCredentialDomInputs,
    saveDesktopConfig: saveDesktopConfigOverride || saveDesktopCredentialConfig,
    // TODO(desktop 收尾,超出本次 app-actions 补线范围):真实连通性检查可以接
    // appActionsFeature.checkApiConnectivity()(该特性现已挂载,见下方装配块),
    // 但桌面模式在当前 React 世界未真正激活(entry.jsx 从不翻转
    // isDesktopMode/initialDesktopMode),这里贸然接线会让
    // credentials-dialog-component.test.mjs 的桌面保存测试在 jsdom 下真的发起
    // fetch("/api/v1/health") 而失败——维持 no-op 占位,不阻塞浏览器模式(主路径)。
    checkApiConnectivity: checkApiConnectivityOverride || (() => Promise.resolve()),
    validateOcrToken: validateOcrTokenOverride || validateCredentialOcrToken,
    validateDeepSeekToken: validateDeepSeekTokenOverride,
    queryDeepSeekBalance: queryDeepSeekBalanceOverride,
    onCredentialStateChange: () => features.workflowFeature?.applyWorkflowMode?.(),
    runtimeEnvPort: createCredentialRuntimeEnvPort(legacyState),
    uploadStatePort,
    viewPort: credentialsView.viewPort,
    dialogElementsPort: credentialsView.elementsPort,
    setupModePort: {
      currentSetupMode: () => credentialsView.store.getSnapshot().setupMode,
    },
  });

  // ---- glossaries 特性(GlossariesDialog 域;纯逻辑控制器 controller.js 原样
  //      复用,只把 viewPort 换成 store 驱动的 React 实现;蓝图 §3) ----
  const glossariesDialogStore = createGlossariesDialogStore();
  const glossariesView = createGlossariesViewFeature({ dialogStore: glossariesDialogStore });
  features.glossariesFeature = mountGlossariesFeature({
    apiPrefix: API_PREFIX,
    fetchGlossaries,
    fetchGlossary: fetchGlossaryOverride,
    createGlossary: createGlossaryOverride,
    updateGlossary: updateGlossaryOverride,
    deleteGlossary: deleteGlossaryOverride,
    exportGlossaryCsv: exportGlossaryCsvOverride,
    parseGlossaryCsv: parseGlossaryCsvOverride,
    // 3a workflow 域的反向回调(蓝图 §3/§8 依赖矩阵):保存/删除术语表后刷新
    // WorkflowPanel 的术语表下拉。workflow 域已经 expose 了等价函数
    // (loadGlossaryOptions,签名同为 {force, selectedId}),composition 直接接上,
    // 不是占位 no-op——workflow 域尚未挂载时(理论上不会发生,composition 里
    // workflowFeature 先于本段构造)才会落到可选调用兜底。
    refreshWorkflowGlossaries: (options) => features.workflowFeature?.loadGlossaryOptions?.(options),
    viewPort: glossariesView.viewPort,
  });
  // controller.js 的 bindEvents() 需要显式调用一次(不像 mountBrowserCredentialsFeature
  // 那样在 mount 内部自动调用),捕获 open/close/reload/... 等处理函数到
  // glossariesView.handlersRef,供 GlossariesDialog.jsx 系组件的 onClick 直接使用。
  features.glossariesFeature.bindEvents();

  // ---- app-update 特性(AppUpdateBanner 域;纯逻辑控制器 controller.js 原样
  //      复用,只把 viewPort 换成 store 驱动的 React 实现;蓝图 §5) ----
  const appUpdateView = createAppUpdateViewFeature();
  features.appUpdateFeature = mountAppUpdateFeature({
    enabled: appUpdateAutoCheckEnabled,
    cachePort: appUpdateCachePortOverride,
    fetchLatestRelease: fetchLatestReleaseOverride,
    normalizeRelease: normalizeReleaseInfo,
    viewPort: appUpdateView.viewPort,
  });

  // ---- app-shell 特性:idle 复位链(纯逻辑 idle-reset.js 原样复用) ----
  function initializeIdleView() {
    initializeIdleAppView({
      configPort: defaultAppShellConfigPort,
      jobPresentationPort: { normalizeJobPayload, summarizeStatus },
      setText,
      setWorkflowSections: bridge.setWorkflowSections,
      setLinearProgress: bridge.setLinearProgress,
      updateActionButtons: bridge.updateActionButtons,
      renderPageRangeSummary: bridge.renderPageRangeSummary,
      resetUploadProgress: bridge.resetUploadProgress,
      resetUploadedFile: bridge.resetUploadedFile,
      applyWorkflowMode: bridge.applyWorkflowMode,
      updateJobWarning: bridge.updateJobWarning,
      resetEventsList: bridge.resetEventsList,
      activateDetailTab: bridge.activateDetailTab,
    });
  }
  features.appShellFeature = { initializeIdleView };

  // ---- 3b:job-runtime + recent-jobs 引擎装配(蓝图 §4 createHomeComposition 扩展方案) ----
  //
  // state 是可变字面量"状态袋"(旧世界全局 state 的溶解形态),job-runtime 引擎
  // 内部通过 Symbol.for(...) 键把 currentJobStore/secondaryResourceStore 单例
  // 挂在它身上——这里提前调 currentJobStoreFor/secondaryResourceStoreFor 拿到
  // 同一份 store 引用,供 statusCardPresenter 订阅,不新建一份平行状态。
  const jobRuntimeState = {};
  const currentJobStore = currentJobStoreFor(jobRuntimeState);
  const secondaryResourceStore = secondaryResourceStoreFor(jobRuntimeState);
  const statusCardStore = createStatusCardStore();
  const statusCardPresenter = createStatusCardPresenter({
    state: jobRuntimeState,
    currentJobStore,
    secondaryResourceStore,
    statusCardStore,
  });

  // ---- StatusDetailDialog 域(dialogs 蓝图 §1)——数据源铁律:自己 fetch
  // (events/diagnostics/resumePlan),与 statusCardStore 并行不合并;runtimePort
  // 用同一个 jobRuntimeState 构造,拿到与 job-runtime 引擎同一份
  // currentJobStore/secondaryResourceStore 引用(蓝图 §1.0)。renderJob 复用
  // statusCardPresenter.renderMain——status-detail 自己发起的更新鲜的整份
  // job payload 拉取,也应该让状态卡跟着刷新(镜像旧世界 buildStatusDetailMountPayload
  // 与 job-runtime 共用同一个 renderJob 回调注入点)。
  const statusDetailStore = createStatusDetailStore();
  const statusDetailDialogStore = createStatusDetailDialogStore();
  const statusDetailRuntimePort = createStatusDetailRuntimePort(jobRuntimeState);
  const statusDetailController = createStatusDetailController({
    runtimePort: statusDetailRuntimePort,
    apiPrefix: API_PREFIX,
    fetchJobPayload,
    fetchJobEvents,
    fetchJobDiagnostics,
    fetchResumePlan,
    fetchTranslationDiagnostics,
    fetchTranslationItems,
    fetchTranslationItem,
    replayTranslationItem,
    rerunJob,
    renderJob: statusCardPresenter.renderMain,
    startPolling: (jobId) => features.jobRuntimeFeature?.startPolling(jobId),
    setText,
    store: statusDetailStore,
    dialogStore: statusDetailDialogStore,
  });

  // ---- ReaderDialog 域(dialogs 蓝图 §4)——开合状态用 dialog-store 工厂
  // (§0.3),payload 形状 { jobId, url, anchor };打开触发统一走
  // APP_EVENTS.openReaderRequested(ReaderDialog.jsx 内的 useAppEvent 是唯一
  // 消费点),composition 这里只需要给 job-runtime 引擎一个真实的
  // isReaderOpen() 读面 + 关闭回调,不持有 URL/进度等纯视图态。
  const readerDialogStore = createReaderDialogStore();

  // shellViewPort 契约(job-runtime/shell-view-port.js 的 4 方法字面量——不
  // import 该工厂函数本身:它的文件名匹配 architecture-boundaries.test.mjs
  // 的 features/*view-port.js 防回弹正则,即便这是"全部保留"的引擎文件也会
  // 被拦;4 方法都是零逻辑的直通默认值,直接字面量构造行为完全等价)。
  //
  // 取消按钮禁用态(StatusCard.jsx)与 status-detail 对话框关闭已接线;reader
  // 对话框开合状态接回 readerDialogStore(dialogs 蓝图 §4)。
  const jobRuntimeShellViewPort = {
    closeDialogs: () => statusDetailDialogStore.close(),
    isReaderOpen: () => Boolean(readerDialogStore.getState().open),
    resetEvents: () => bridge.resetEventsList(),
    setCancelDisabled: (disabled) => statusCardStore.actions.setCancelDisabled(disabled),
  };

  // ---- artifact-downloads 域(dialogs 蓝图 §7)——document 级委托点击行为
  // hook;controller.js/download-actions.js/runtime-port.js(纯逻辑)原样
  // import 并 mount。viewPort 三方法用字面量对象直接实现(镜像上面
  // jobRuntimeShellViewPort 的处理手法):download-view-port.js 与其内部的
  // view.js 文件名分别匹配 architecture-boundaries.test.mjs 的
  // features/*view-port.js、features/*/view.js 防回弹正则,composition.js
  // (src/pages/**)不能 import——哪怕只是想复用它"零逻辑"的 DOM 委托绑定。
  // 且这两个旧文件仍是尚未 cutover 的 dist/app.bundle.js(旧世界
  // bootstrap/mount-credential-action-features.js)当前唯一在用的实现,不能
  // 改动其默认行为(改了会砸掉仍在生产的旧世界下载"下载中..."文案),
  // 所以这里必须是一份独立的、字面量构造的 React 专用 viewPort 实例,而不是
  // 复用/篡改旧文件。
  //
  // setLinkBusy 落 artifactDownloadBusyStore(蓝图 §7.5 方案二)而非直改
  // DOM——按钮各自订阅自己的 actionId 分片(见 state/
  // artifact-download-busy-store.js 头注释,规避父组件重渲染覆盖"下载中..."
  // 文案)。isLinkDisabled 组合两路判断:DOM aria-disabled/class(反映
  // React 渲染的 ready 态)+ busy store(反映下载进行中)。
  const artifactDownloadBusyStore = createArtifactDownloadBusyStore();
  const artifactDownloadsViewPort = {
    bindProtectedLinks(handler) {
      documentRef?.addEventListener?.("click", (event) => {
        const link = event.target?.closest?.(PROTECTED_ARTIFACT_SELECTOR);
        if (!link) {
          return;
        }
        handler(event, link);
      });
    },
    isLinkDisabled(link) {
      const domDisabled = link?.getAttribute?.("aria-disabled") === "true"
        || Boolean(link?.classList?.contains?.("disabled"));
      return domDisabled || artifactDownloadBusyStore.isBusy(link?.id || "");
    },
    setLinkBusy(link, busy, text = "") {
      artifactDownloadBusyStore.setBusy(link?.id || "", busy, text);
    },
  };

  const libraryEventPort = createRecentJobsLibraryRefreshPort({ target: documentRef });
  const recentJobsStatePort = createRecentJobsStatePort();
  const recentJobsViewPort = createRecentJobsReactViewPort();
  // F2 文档中心化:网格数据源从 job 投影(library/books)换成"文档中心统一
  // loader"(每篇文档一张卡,已翻译的合并 library/books 活态,馆藏文档也进网格)。
  // 这是 recent-jobs 引擎的 libraryBooksResource 注入点——引擎其余部分(store/
  // 去重/轮询/进度合并/封面)按 job_id 一行不改地复用(馆藏文档用合成 job_id
  // 穿过)。详见 js/features/documents-library/*。
  const documentLibraryResource = createDocumentLibraryResource({
    fetchDocumentList,
    fetchLibraryBookList,
    apiPrefix: API_PREFIX,
  });

  const recentJobsJobRuntimePort = createRecentJobsRuntimePort({
    openJob: (jobId) => features.jobRuntimeFeature?.startPolling(jobId),
    currentJobId: () => features.jobRuntimeFeature?.currentJobId() || "",
  });
  // openReader 收口在"发出请求"这一步(3b 范围);真正打开 <reader-dialog> 的
  // iframe 内容是后续 dialogs agent 的范围——统一走 openReaderRequested,与
  // 3a 已落地的"库检索岛"入口(startup-route-recent-jobs-payloads.js 同名
  // 事件)共用同一条契约,dialogs agent 只需订阅这一处即可覆盖两个来源。
  const recentJobsReaderPort = createRecentJobsReaderPort({
    openReader: (jobId, anchor = null) => {
      const normalizedJobId = `${jobId || ""}`.trim();
      if (!normalizedJobId) {
        return;
      }
      features.jobRuntimeFeature?.startPolling(normalizedJobId);
      if (documentRef?.dispatchEvent && typeof globalThis.CustomEvent === "function") {
        documentRef.dispatchEvent(new globalThis.CustomEvent(APP_EVENTS.openReaderRequested, {
          detail: {
            jobId: normalizedJobId,
            pageIdx: Number.isFinite(anchor?.pageIdx) ? anchor.pageIdx : null,
            blockId: anchor?.blockId || "",
          },
        }));
      }
    },
  });
  const recentJobsNavigationPort = createRecentJobsNavigationPort({
    closeDialog: () => {}, // recent-jobs-dialog 元素形态不在主视图启用(蓝图 §2)
    currentJobId: () => features.jobRuntimeFeature?.currentJobId() || "",
    jobRuntimePort: recentJobsJobRuntimePort,
    readerPort: recentJobsReaderPort,
    doc: documentRef,
  });
  // 组合根级别直接 import 并构造 recentJobActions(蓝图 §1:actions.js 是"保留
  // 原样(引擎)"文件,composition.js 直接 import 并 mount)——
  // mountRecentJobsFeature 的公开返回值不透出内部 runtime.recentJobActions,
  // 卡片交互(select/delete/reader)需要这三个回调,在这里用同样的
  // statePort/navigationPort 单独构造一份;纯函数式端口,构造两份与内部那份
  // 行为等价(不持有独立引擎状态)。
  const recentJobActions = createRecentJobActions({
    apiPrefix: API_PREFIX,
    deleteLibraryBook,
    activeJobRecoveryPort: { readActiveJobId },
    navigationPort: recentJobsNavigationPort,
    renderCurrentRecentJobs: () => {}, // React 组件直读 store,无需强制重渲回调
    renderRecentJobsEmpty: recentJobsViewPort.renderEmpty,
    renderRecentJobsError: recentJobsViewPort.renderError,
    statePort: recentJobsStatePort,
  });

  // F4 馆藏文档"读原文":无 job,派发带 documentId 的 openReaderRequested,
  // ReaderDialog 用 document_id 打开只读源文档阅读器(与卡片对照阅读同一事件契约)。
  function openSourceReader(documentId) {
    const normalizedId = `${documentId || ""}`.trim();
    if (!normalizedId) {
      return;
    }
    if (documentRef?.dispatchEvent && typeof globalThis.CustomEvent === "function") {
      documentRef.dispatchEvent(new globalThis.CustomEvent(APP_EVENTS.openReaderRequested, {
        detail: { documentId: normalizedId, pageIdx: null, blockId: "" },
      }));
    }
  }

  // F5 馆藏文档"以后再翻":复用文档已存的 upload 起 book 翻译 job,后端回填
  // active_job_id;随后整页重载一次——该文档会以真实 job_id 重新进网格,现有
  // 轮询引擎(active-refresh 按 job_id 拉 job payload)自然接管进度。
  const translatingDocumentIds = new Set();
  async function translateLibraryDocument(documentId) {
    const normalizedId = `${documentId || ""}`.trim();
    if (!normalizedId || translatingDocumentIds.has(normalizedId)) {
      return;
    }
    translatingDocumentIds.add(normalizedId);
    try {
      await translateDocument(API_PREFIX, normalizedId);
    } catch (error) {
      recentJobsViewPort.renderError(
        `${error?.message || "发起翻译失败，请稍后重试。"}`,
        { reset: false },
      );
      return;
    } finally {
      translatingDocumentIds.delete(normalizedId);
    }
    await features.recentJobsFeature?.loadRecentJobs?.({ reset: true });
  }

  // ---- app-actions 特性(提交流程域;之前 cutover 遗漏,补线接入)——
  // controller.js(mountAppActionsFeature)/submit-flow.js(runSubmitFlow)/
  // config-port.js/job-snapshot-port.js/runtime-env-port.js/upload-state-port.js
  // 全部原样复用;view.js/action-view-port.js(旧 DOM 直写,且文件名匹配
  // architecture-boundaries 的 features/*view-port.js 防回弹正则,React 世界
  // 禁止 import)判死,下面的 appActionsJobSnapshotPort/appActionsViewPort 是
  // 等价的 React store 驱动实现。
  //
  // jobSnapshotPort:镜像旧 bootstrap/app-actions-job-snapshot-port.js 的真实
  // 实现(controller.js 自带的默认值是 no-op 占位,必须显式覆盖)——写入与
  // job-runtime 引擎同一个 jobRuntimeState/currentJobStore,不建平行状态。
  const appActionsJobSnapshotPort = Object.freeze({
    syncCurrentJobSnapshot: (payload, jobId, meta) => (
      syncCurrentJobSnapshot(jobRuntimeState, payload, jobId, meta)
    ),
  });
  const appActionsViewPort = {
    // 提交中状态反馈:写 workflowView store(HeroUpload.jsx 的 #submit-btn
    // 已订阅 workflow.submitBusy 驱动禁用态 + "提交中…" 文案),不直写 DOM。
    setSubmitBusyState: (busy) => {
      workflowView.setSubmitBusy(busy);
    },
    // 404 "upload not found":清空上传域状态,错误文案复用已验证的
    // bridge.setText,不新建 DOM 写入路径(镜像旧 view.js 的
    // resetMissingUploadState 语义,但落到 uploadStatePort/workflowView/
    // uploadView 三份 React 数据源)。
    resetMissingUpload: () => {
      uploadStatePort.reset({ includePageRange: false });
      workflowView.setSubmitDisabled(true);
      uploadView.resetUploadedFileView();
      setText("error-box", "当前上传文件已失效，请重新上传 PDF 后再提交。");
    },
  };
  features.appActionsFeature = mountAppActionsFeature({
    state: jobRuntimeState,
    // uploadStatePort 是 upload 域(3a)与 job-runtime 引擎共用的同一份
    // getSnapshot/reset/setSubmitBusy 端口(js/features/upload/state.js),
    // 形状与 app-actions 自己的默认 upload-state-port.js 完全一致,直接复用
    // 同一份数据源,不再桥接第二份。
    uploadStatePort,
    // runtimeEnvPort 复用 app-actions 自带的工厂函数(判死清单以外的"保留
    // 原样"文件),读同一个 legacyState(desktopMode/desktopConfigured),与
    // credentials 域的 createCredentialRuntimeEnvPort(legacyState) 同源。
    runtimeEnvPort: createAppActionsRuntimeEnvPort(legacyState),
    jobSnapshotPort: appActionsJobSnapshotPort,
    viewPort: appActionsViewPort,
    configPort: defaultAppActionsConfigPort,
    apiPrefix: API_PREFIX,
    buildApiEndpoint,
    setText,
    openDesktopOutputDirectory,
    resetUploadedFile: bridge.resetUploadedFile,
    submitFlow: {
      // 桌面模式在当前 React 世界未真正接线:entry.jsx 从不翻转
      // initialDesktopMode/setDesktopMode(legacyState.desktopMode 恒为
      // false),所以 DESKTOP_NOT_CONFIGURED 分支目前实际不可达。先复用
      // credentials 域的 setupMode 对话框(与旧世界 desktop/index.js 的
      // openSetupDialog 语义等价:打开凭据对话框并置 setupMode),不新起
      // DOM 路径;桌面模式完整度现状见任务汇报。
      openSetupDialog: () => (
        features.browserCredentialsFeature?.openBrowserCredentialsDialog?.({ setupMode: true })
      ),
      renderJob: statusCardPresenter.renderMain,
      submitJobRequest,
      currentWorkflow: () => features.workflowFeature?.currentWorkflow(),
      workflowNeedsCredentials: (workflow) => features.workflowFeature?.workflowNeedsCredentials(workflow),
      workflowNeedsUpload: (workflow) => features.workflowFeature?.workflowNeedsUpload(workflow),
      currentRenderSourceJobId: () => features.workflowFeature?.currentRenderSourceJobId(),
      currentBudgetState: (workflow) => features.workflowFeature?.currentBudgetState(workflow),
      collectRunPayload: () => features.workflowFeature?.collectRunPayload(),
      validateBeforeSubmit: () => features.uploadFeature?.validatePageRanges?.() ?? true,
      ensureOcrCredentialsReady: (options) => (
        features.browserCredentialsFeature?.ensureOcrCredentialsReady?.(options)
      ),
      hasBrowserCredentials: () => Boolean(features.browserCredentialsFeature?.hasBrowserCredentials?.()),
      openBrowserCredentialsDialog: (options) => (
        features.browserCredentialsFeature?.openBrowserCredentialsDialog?.(options)
      ),
      refreshDeepSeekBalance: (options) => (
        features.browserCredentialsFeature?.refreshDeepSeekBalance?.(options)
      ),
      startJobPolling: (jobId) => features.jobRuntimeFeature?.startPolling(jobId),
      libraryEventPort,
      jobSnapshotPort: appActionsJobSnapshotPort,
    },
  });

  let disposeDialogEvents = null;
  let disposeJobRuntimeDocumentEvents = null;
  let startupRouteApplied = false;

  function initialize() {
    if (!disposeDialogEvents) {
      disposeDialogEvents = workflowDialog.bindEvents();
    }
    initializeIdleView();

    if (!features.jobRuntimeFeature) {
      features.jobRuntimeFeature = mountJobRuntimeFeature({
        state: jobRuntimeState,
        apiPrefix: API_PREFIX,
        buildJobDetailEndpoint,
        fetchJobPayload,
        fetchJobEvents,
        fetchJobArtifactsManifest,
        fetchJobStageActions,
        retryJobStage,
        submitJson,
        renderJob: statusCardPresenter.renderMain,
        renderJobSecondaryPatch: statusCardPresenter.renderPatch,
        setText,
        setWorkflowSections: bridge.setWorkflowSections,
        resetUploadProgress: bridge.resetUploadProgress,
        resetUploadedFile: bridge.resetUploadedFile,
        applyWorkflowMode: bridge.applyWorkflowMode,
        clearPageRanges: () => features.uploadFeature?.clearPageRanges?.(),
        updateJobWarning: bridge.updateJobWarning,
        activateDetailTab: bridge.activateDetailTab,
        // reader 对话框同步回调(dialogs 蓝图 §4 运行时复核结论):宿主侧
        // 下载按钮已是死代码(下载入口在 reader.html 本体),没有需要每次
        // 轮询都刷新的宿主 UI,维持 no-op;关闭回调接回 readerDialogStore,
        // 与旧 controller.js#close() 的语义对齐(job 回到 idle/新任务开始时
        // 阅读器对话框应随之关闭)。
        onReaderDialogSync: () => {},
        onReaderDialogClose: () => readerDialogStore.close(),
        uploadStatePort,
        libraryEventPort,
        shellViewPort: jobRuntimeShellViewPort,
        jobPresentationPort: { normalizeJobPayload, isTerminalStatus, isJobTerminal },
      });
    }

    if (!features.artifactDownloadsFeature) {
      features.artifactDownloadsFeature = mountArtifactDownloadsFeature({
        state: jobRuntimeState,
        fetchProtected,
        setText,
        runtimePort: createArtifactDownloadsRuntimePort({ currentJobId: currentJobIdFor }),
        viewPort: artifactDownloadsViewPort,
        downloadNameResolver: {
          resolveSourcePdfName: resolveSourcePdfDownloadName,
          resolveTranslatedPdfName: resolveTranslatedPdfDownloadName,
        },
      });
      // controller.js 的 bindEvents() 需要显式调用一次(与 glossariesFeature
      // 同款,不像 mountBrowserCredentialsFeature 那样在 mount 内部自动绑定)
      // ——把 document 级委托点击处理器真正挂上去,否则 7 个下载 id 仍是裸
      // <a> 跳转(本域要修复的核心缺口)。
      features.artifactDownloadsFeature.bindEvents();
    }

    if (!features.recentJobsFeature) {
      features.recentJobsFeature = mountRecentJobsFeature({
        fetchJobList,
        fetchJobPayload,
        fetchLibraryBookList,
        deleteLibraryBook,
        apiPrefix: API_PREFIX,
        currentJobId: () => features.jobRuntimeFeature.currentJobId() || "",
        activeJobRecoveryPort: { readActiveJobId },
        jobRuntimePort: recentJobsJobRuntimePort,
        readerPort: recentJobsReaderPort,
        navigationPort: recentJobsNavigationPort,
        stageAdapterPort: { adaptJobStageSnapshot },
        homeStatePort,
        recentJobsStatePort,
        viewPort: recentJobsViewPort,
        libraryRefreshPort: libraryEventPort,
        // F2:注入文档中心数据源(controller.js 会把它同时喂给 runtime→loader
        // 和 bindings→缓存失效),网格从此按文档而非 job 组织。
        libraryBooksResource: documentLibraryResource,
        // isWorkflowOpen 的默认实现(workflow-open-port.js)直接查
        // #translation-workflow-dialog 的 data-open 属性——TranslationWorkflowDialog.jsx
        // 渲染的正是同一个 id/属性契约,默认值无需在此覆写(mountRecentJobsFeature
        // 未开放 environment 注入口,覆写点在更底层的 refresh-scheduler.js,
        // 强行覆写需要绕过 controller.js,与"引擎一行不改"铁律冲突)。
      });
    }

    // retryStage:StageRetry.jsx dispatch,job-runtime 引擎消费(蓝图 §5 事件
    // 契约,原样保留)。
    // returnHome:status-area.js 的 returnHome() dispatch(工作流对话框处于
    // 状态模式时点 × 走这条路,而非直接关闭——见 TranslationWorkflowDialog
    // 的 requestClose 语义),之前只有 dispatch 没有消费方,点击无反应;
    // job-runtime 引擎的 returnToHome() 是现成的完整重置逻辑,这里接上。
    if (!disposeJobRuntimeDocumentEvents && documentRef?.addEventListener) {
      const onRetryStage = (event) => {
        const stage = `${event?.detail?.stage || ""}`.trim();
        if (stage) {
          features.jobRuntimeFeature.retryStage(stage);
        }
      };
      const onReturnHome = () => {
        features.jobRuntimeFeature.returnToHome();
      };
      documentRef.addEventListener(APP_EVENTS.retryStage, onRetryStage);
      documentRef.addEventListener(APP_EVENTS.returnHome, onReturnHome);
      disposeJobRuntimeDocumentEvents = () => {
        documentRef.removeEventListener(APP_EVENTS.retryStage, onRetryStage);
        documentRef.removeEventListener(APP_EVENTS.returnHome, onReturnHome);
      };
    }

    // startup 路由(蓝图 §4:平移 startup-route.js:49-81 + startup-location.js
    // 的 getRequestedReaderJobIdFromLocation)——"URL ?job_id= 启动轮询"这一半
    // 在这里接上。"?view=reader&job_id= 直接打开阅读器对话框"那一半改由
    // ReaderDialog.jsx 自己在挂载 effect 里读一次 URL 直接 open()(不经
    // openReaderRequested 事件):实测过用 setTimeout(0) 从这里派发事件,会
    // 与 React 首次挂载后才触发的 useAppEvent 监听器注册产生竞态——
    // composition 的 initialize() 在 render() 之前调用,若两边都退化成
    // setTimeout(0) 调度,派发可能先于监听器就绪,深链启动整个打不开对话框
    // （jsdom 回归测试复现过);ReaderDialog 自己读 URL 不依赖任何跨模块时序
    // 假设,一并消除竞态。
    if (!startupRouteApplied) {
      startupRouteApplied = true;
      const startupReaderJobId = requestedReaderJobIdFromLocation();
      const startupJobId = startupReaderJobId
        || `${new URLSearchParams(globalThis.location?.search || "").get("job_id") || ""}`.trim();
      if (startupJobId) {
        features.jobRuntimeFeature.startPolling(startupJobId);
      }
    }
  }

  function dispose() {
    disposeDialogEvents?.();
    disposeDialogEvents = null;
    disposeJobRuntimeDocumentEvents?.();
    disposeJobRuntimeDocumentEvents = null;
    features.jobRuntimeFeature?.stopPolling();
  }

  return {
    bridge,
    dispose,
    features,
    initialize,
    ports: {
      credentialsStatePort,
      dialogStatePort,
      homeStatePort,
      uploadStatePort,
    },
    stores: {
      dialog: dialogStatePort.store,
      homeState: homeStatePort.store,
      statusArea: statusArea.store,
      text: textStore.store,
      uploadView: uploadView.store,
      workflowView: workflowView.store,
      // 3b credentials 域(蓝图 §2):对话框内校验反馈/setupMode/DeepSeek 充值
      // 提示等纯视图态;credentialGate 分片是只读订阅面(见文首 mount 处注释)。
      credentialsView: credentialsView.store,
    },
    statusArea,
    // 3b credentials 域(蓝图 §2 + §0.3/§0.4):CredentialsDialog.jsx 与
    // SettingsHubDialog.jsx 的唯一装配入口——后续 GlossariesDialog/
    // AppUpdateBanner agent 复用同一个 settingsHubDialogStore 挂自己的 tab
    // 内容(词表/更新两个 tab 目前只是占位容器,见 SettingsHubDialog.jsx)。
    credentials: {
      feature: features.browserCredentialsFeature,
      view: credentialsView,
      dialogStore: credentialsDialogStore,
    },
    settingsHub: {
      dialogStore: settingsHubDialogStore,
    },
    // 3b glossaries 域(蓝图 §3):GlossariesDialog.jsx 的唯一装配入口。
    // SettingsHubDialog.jsx"词表"tab 的 #glossary-btn 已按同样的服务命名
    // (services.glossaries.dialogStore.open())占位调用,这里接上即生效。
    glossaries: {
      feature: features.glossariesFeature,
      view: glossariesView,
      dialogStore: glossariesDialogStore,
    },
    // 3b app-update 域(蓝图 §5):AppUpdateBanner.jsx 的唯一装配入口,挂在
    // SettingsHubDialog.jsx"更新"tab 面板下(按钮 + 详情 dialog 合并一体)。
    appUpdate: {
      feature: features.appUpdateFeature,
      view: appUpdateView,
      handlersRef: appUpdateView.handlersRef,
    },
    // 3b:图书馆网格(RecentJobsLibrary.jsx/RecentJobCard.jsx)与搜索输入
    // (LibraryBottomBar,HomeApp.jsx)共用的读写面——viewPort.store 是
    // library-view-store.js,recentJobsStore 是引擎的唯一真值(蓝图 §0)。
    library: {
      viewPort: recentJobsViewPort,
      recentJobsStore: recentJobsStatePort.store,
      actions: { ...recentJobActions, openSourceReader, translateDocument: translateLibraryDocument },
    },
    // CategoriesView.jsx/CollectionManageDialog.jsx 的唯一装配入口。没有旧
    // 世界 controller.js 可复用(collections/collection_documents 表随图书馆
    // 数据层建好,一直没接路由——这是纯 React 时代新建的域),controller 是
    // 绑好 apiPrefix 的薄函数集合,不套其余域的 mountXFeature 壳子。
    collections: {
      controller: createCollectionsController({ apiPrefix: API_PREFIX }),
      dialogStore: createCollectionManageDialogStore(),
      // CollectionManageDialog.jsx 和 CategoriesView.jsx 是兄弟节点,保存/
      // 删除成功后靠这个 version 信号桥接刷新(见两个文件头注释)。
      reloadSignal: createStore({ name: "collectionsReload", initialState: { version: 0 }, actions: {
        bump: (state) => ({ version: state.version + 1 }),
      } }),
    },
    // artifact-downloads 域(dialogs 蓝图 §7)——按钮宿主(ResultActions.jsx/
    // StatusDetailDialog.jsx 的 overview 面板)唯一消费入口:busyStore 供
    // useArtifactDownloadBusy(actionId) 订阅渲染"下载中..."文案(方案二)。
    // controller/viewPort 本身不需要对外暴露(document 级委托点击,与具体谁
    // 渲染了按钮无关,initialize() 里已经 bindEvents() 一次)。
    artifactDownloads: {
      busyStore: artifactDownloadBusyStore,
    },
    // StatusCard.jsx 家族的读面 + 取消动作;statusCardStore 与 statusDetail 域
    // 共享同一个 renderJob 回调注入点,但读路径并不合并(蓝图 §1.0 数据源
    // 铁律)。
    statusCard: {
      store: statusCardStore,
      cancelCurrentJob: () => features.jobRuntimeFeature?.cancelCurrentJob(),
    },
    // StatusDetailDialog.jsx 家族的唯一装配入口(dialogs 蓝图 §1)——
    // StatusCard.jsx 的 #status-detail-btn 直调 controller.openStatusDetailDialog,
    // 不走事件。
    statusDetail: {
      store: statusDetailStore,
      dialogStore: statusDetailDialogStore,
      controller: statusDetailController,
    },
    // ReaderDialog.jsx 的唯一装配入口(dialogs 蓝图 §4)——openReader 复用
    // recentJobsReaderPort 同一个函数(startPolling + dispatch
    // openReaderRequested),ResultActions.jsx「对照阅读」链接与 recent-jobs
    // 卡片、library-search 岛走同一条打开链路,不建第二条平行路径。
    reader: {
      dialogStore: readerDialogStore,
      openReader: recentJobsReaderPort.openReader,
    },
    textOf: textStore.textOf,
    uploadDomRefs: uploadView.domRefs,
    uploadViewActions: {
      patch: uploadView.patch,
    },
    workflowViewActions: {
      setSelectedGlossaryId: workflowView.setSelectedGlossaryId,
    },
    workflowDialog,
  };
}
