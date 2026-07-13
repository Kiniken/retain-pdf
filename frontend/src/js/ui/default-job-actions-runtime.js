import {
  clearCurrentJobTiming,
} from "../features/job-runtime/current-job-state.js";
import { createJobRuntimeResetStatePort } from "../features/job-runtime/reset-state-port.js";
import {
  resetJobSecondaryState,
  resetJobState,
} from "../state/job-state.js";
import {
  clearAppliedPageRange,
  resetUploadState,
} from "../features/upload/state.js";
import { state } from "../state/store.js";
import { createJobActionsRuntime } from "./job-actions-runtime.js";

const defaultResetStatePort = createJobRuntimeResetStatePort(state, {
  // 上传状态已统一到共享单例 store,忽略 targetState 载体
  clearAppliedPageRange: () => clearAppliedPageRange(),
  resetJobSecondaryState,
  resetJobState,
  resetUploadState: (_target, options) => resetUploadState(options),
});

export const defaultJobActionsRuntime = createJobActionsRuntime({
  clearTiming: clearCurrentJobTiming,
  resetUpload: (_target, options) => defaultResetStatePort.resetUpload(options),
  runtimeState: state,
});
