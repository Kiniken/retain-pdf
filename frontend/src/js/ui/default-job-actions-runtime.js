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
} from "../state/upload-state.js";
import { state } from "../state/store.js";
import { createJobActionsRuntime } from "./job-actions-runtime.js";

const defaultResetStatePort = createJobRuntimeResetStatePort(state, {
  clearAppliedPageRange,
  resetJobSecondaryState,
  resetJobState,
  resetUploadState,
});

export const defaultJobActionsRuntime = createJobActionsRuntime({
  clearTiming: clearCurrentJobTiming,
  resetUpload: (_target, options) => defaultResetStatePort.resetUpload(options),
  runtimeState: state,
});
