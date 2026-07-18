// composition 层唯一的 ../../../js/* 入口。
// 领域工厂只从这里拿外部依赖，禁止再直接 import ../../../js。

// —— config / constants ——
export { API_PREFIX } from "../../../js/config/api-constants.js";
export {
  apiBase,
  defaultModelApiKey,
  defaultModelBaseUrl,
  defaultModelName,
  defaultOcrProvider,
  defaultPaddleApiUrl,
  defaultPaddleToken,
} from "../../../js/config/runtime.js";
export {
  DEFAULT_FILE_LABEL,
  FRONT_MAX_BYTES,
  FRONT_MAX_PAGE_COUNT,
} from "../../../js/config/upload-constants.js";
export {
  loadBrowserStoredConfig,
  loadDeveloperStoredConfig,
  saveBrowserStoredConfig,
  savePersistedBrowserStoredConfig,
  savePersistedDeveloperStoredConfig,
} from "../../../js/config/persisted-config.js";
export { openDesktopOutputDirectory } from "../../../js/config/desktop-persistence.js";

// —— state ——
export {
  createDeveloperState,
  getDeveloperConfig,
  resetDeveloperConfig,
  setDeveloperConfig,
} from "../../../js/state/developer-state.js";
export {
  createDesktopState,
  isDesktopMode,
  setDesktopConfigured,
  setDesktopMode,
} from "../../../js/state/desktop-state.js";

// —— contracts / framework ——
export { APP_EVENTS } from "../../../js/contracts/app-contract.js";
export { PROTECTED_ARTIFACT_SELECTOR } from "../../../js/contracts/download-action-contract.js";
export { createStore } from "../../../js/app-framework/store.js";

// —— job helpers ——
export { buildJobWarningViewModel } from "../../../js/job/workflow-visibility-view-model.js";
export { normalizeJobPayload } from "../../../js/job/normalize.js";
export { summarizeStatus } from "../../../js/job/diagnostics.js";
export { isJobTerminal, isTerminalStatus } from "../../../js/job/core.js";
export {
  resolveSourcePdfDownloadName,
  resolveTranslatedPdfDownloadName,
} from "../../../js/job/artifacts.js";
export { adaptJobStageSnapshot } from "../../../js/job-status/job-stage-contract-adapter.js";

// —— api ——
export {
  buildApiEndpoint,
  buildJobDetailEndpoint,
  fetchProtected,
  submitJson,
  submitUploadRequest as submitUploadRequestHttp,
} from "../../../js/api/http.js";
export {
  fetchJobList,
  fetchJobPayload,
} from "../../../js/api/jobs-query.js";
export { fetchJobEvents } from "../../../js/api/jobs-events.js";
export { fetchJobArtifactsManifest } from "../../../js/api/jobs-artifacts.js";
export {
  fetchJobDiagnostics,
  fetchJobStageActions,
  fetchResumePlan,
  rerunJob,
  retryJobStage,
} from "../../../js/api/jobs-actions.js";
export { submitJobRequest } from "../../../js/api/jobs-submit.js";
export {
  fetchLibraryBookList,
  deleteLibraryBook,
} from "../../../js/api/library-books.js";
export { fetchDocumentList } from "../../../js/api/documents.js";
export {
  validateDeepSeekToken,
  queryDeepSeekBalance,
  validatePaddleToken,
} from "../../../js/api/providers.js";
export {
  fetchGlossaries as fetchGlossariesApi,
  fetchGlossary as fetchGlossaryApi,
  createGlossary as createGlossaryApi,
  updateGlossary as updateGlossaryApi,
  deleteGlossary as deleteGlossaryApi,
  exportGlossaryCsv as exportGlossaryCsvApi,
  parseGlossaryCsv as parseGlossaryCsvApi,
} from "../../../js/api/glossaries.js";
export {
  fetchTranslationDiagnostics,
  fetchTranslationItems,
  fetchTranslationItem,
  replayTranslationItem,
} from "../../../js/api/translation-debug.js";

// —— feature controllers / ports ——
export { createHomeStatePort } from "../../../js/features/home/state.js";
export { createUploadStatePort } from "../../../js/features/upload/state.js";
export { mountUploadFeature } from "../../../js/features/upload/controller.js";
export { countPdfPages } from "../../../js/features/upload/pdf-page-count.js";
export { collectUploadFormData } from "../../../js/features/upload/form-data.js";
export { mountWorkflowFeature } from "../../../js/features/workflow/controller.js";
export { defaultWorkflowConfigPort } from "../../../js/features/workflow/config-port.js";
export { defaultCredentialsStatePort } from "../../../js/features/credentials/default-state-port.js";
export { readHiddenCredentialDomInputs } from "../../../js/features/credentials/hidden-input-dom-port.js";
export { createCredentialRuntimeEnvPort } from "../../../js/features/credentials/runtime-env-port.js";
export { mountBrowserCredentialsFeature } from "../../../js/features/credentials/browser.js";
export { mountGlossariesFeature } from "../../../js/features/glossaries/controller.js";
export { mountAppUpdateFeature } from "../../../js/features/app-update/controller.js";
export {
  fetchLatestGithubRelease,
  normalizeReleaseInfo,
} from "../../../js/features/app-update/github-release.js";
export { defaultUpdateCachePort } from "../../../js/features/app-update/state.js";
export { createTranslationWorkflowDialogStatePort } from "../../../js/features/translation-workflow-dialog/state.js";
export { mountAppActionsFeature } from "../../../js/features/app-actions/controller.js";
export { defaultAppActionsConfigPort } from "../../../js/features/app-actions/config-port.js";
export { createAppActionsRuntimeEnvPort } from "../../../js/features/app-actions/runtime-env-port.js";
export { mountJobRuntimeFeature } from "../../../js/features/job-runtime/controller.js";
export {
  currentJobStoreFor,
  currentJobId as currentJobIdFor,
  syncCurrentJobSnapshot,
} from "../../../js/features/job-runtime/current-job-state.js";
export { secondaryResourceStoreFor } from "../../../js/features/job-runtime/secondary-resource-cache.js";
export { readActiveJobId } from "../../../js/features/job-runtime/active-job-storage.js";
export { mountRecentJobsFeature } from "../../../js/features/recent-jobs/controller.js";
export { createRecentJobsStatePort } from "../../../js/features/recent-jobs/state.js";
export { createRecentJobActions } from "../../../js/features/recent-jobs/actions.js";
export { createRecentJobsRuntimePort } from "../../../js/features/recent-jobs/job-runtime-port.js";
export { createRecentJobsReaderPort } from "../../../js/features/recent-jobs/reader-port.js";
export { createRecentJobsNavigationPort } from "../../../js/features/recent-jobs/navigation-port.js";
export { createRecentJobsLibraryRefreshPort } from "../../../js/features/recent-jobs/library-refresh-port.js";
export { createDocumentLibraryResource } from "../../../js/features/documents-library/document-library-resource.js";
export { mountArtifactDownloadsFeature } from "../../../js/features/artifact-downloads/controller.js";
export { createArtifactDownloadsRuntimePort } from "../../../js/features/artifact-downloads/runtime-port.js";
export { initializeIdleAppView } from "../../../js/features/app-shell/idle-reset.js";
export { defaultAppShellConfigPort } from "../../../js/features/app-shell/config-port.js";
export { requestedReaderJobIdFromLocation } from "../../../js/features/reader-dialog/routing.js";
