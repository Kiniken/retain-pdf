import {
  isDesktopConfigured,
  isDesktopMode,
} from "../state/desktop-state.js";
import {
  hasValidOcrValidationCache,
  resetDeepSeekBalanceState,
  resetOcrValidationCache,
  setDeepSeekBalanceState,
  setOcrValidationCache,
} from "../state/credential-state.js";
import {
  resetJobSecondaryState,
  resetJobState,
} from "../state/job-state.js";
import {
  clearAppliedPageRange,
  getUploadState,
  resetUploadState,
} from "../state/upload-state.js";

export const legacyDesktopStateAdapter = Object.freeze({
  isDesktopConfigured,
  isDesktopMode,
});

export const legacyUploadStateAdapter = Object.freeze({
  getSnapshot: getUploadState,
  reset: resetUploadState,
});

export const legacyJobRuntimeResetStateAdapter = Object.freeze({
  clearAppliedPageRange,
  resetJobSecondaryState,
  resetJobState,
  resetUploadState,
});

export const legacyCredentialRuntimeStateAdapter = Object.freeze({
  hasValidOcrValidationCache,
  resetDeepSeekBalance: resetDeepSeekBalanceState,
  resetOcrValidationCache,
  setDeepSeekBalance: setDeepSeekBalanceState,
  setOcrValidationCache,
});
