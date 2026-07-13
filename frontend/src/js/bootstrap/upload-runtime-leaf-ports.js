import { submitUploadRequest } from "../api/http.js";
import { API_PREFIX } from "../config/api-constants.js";
import { apiBase } from "../config/runtime.js";
import {
  DEFAULT_FILE_LABEL,
  FRONT_MAX_BYTES,
  FRONT_MAX_PAGE_COUNT,
} from "../config/upload-constants.js";
import { countPdfPages } from "../features/upload/pdf-page-count.js";
import { getUploadStatePort } from "../features/upload/state.js";
import { state } from "../state/store.js";
import {
  clearFileInputValue,
  resetUploadProgress,
  resetUploadedFile,
  setUploadProgress,
} from "../ui/job-actions.js";

export function createUploadRuntimeRuntimePort(overrides = {}) {
  return Object.freeze({
    apiBase,
    ...overrides,
  });
}

export function createUploadRuntimeDefaultsPort(overrides = {}) {
  return Object.freeze({
    apiPrefix: API_PREFIX,
    defaultFileLabel: DEFAULT_FILE_LABEL,
    frontMaxBytes: FRONT_MAX_BYTES,
    frontMaxPageCount: FRONT_MAX_PAGE_COUNT,
    ...overrides,
  });
}

export function createUploadRuntimeHttpPort(overrides = {}) {
  return Object.freeze({
    submitUploadRequest,
    ...overrides,
  });
}

export function createUploadRuntimePdfPort(overrides = {}) {
  return Object.freeze({
    countPdfPages,
    ...overrides,
  });
}

export function createUploadRuntimeLegacyStatePort(overrides = {}) {
  return Object.freeze({
    state,
    ...overrides,
  });
}

export function createUploadRuntimeStatePort(overrides = {}) {
  return Object.freeze({
    // 上传状态已统一到共享单例 port,不再围绕旧全局 state 建实例
    createUploadStatePort: () => getUploadStatePort(),
    ...overrides,
  });
}

export function createUploadRuntimeJobActionsPort(overrides = {}) {
  return Object.freeze({
    clearFileInputValue,
    resetUploadProgress,
    resetUploadedFile,
    setUploadProgress,
    ...overrides,
  });
}
