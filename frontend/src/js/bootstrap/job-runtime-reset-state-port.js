import {
  createJobRuntimeResetStatePort,
} from "../features/job-runtime/reset-state-port.js";
import {
  legacyJobRuntimeResetStateAdapter,
} from "./legacy-state-helper-adapters.js";

export function createJobRuntimeResetStateAdapterPort({
  state,
} = {}) {
  return Object.freeze({
    resetStatePort: createJobRuntimeResetStatePort(
      state,
      legacyJobRuntimeResetStateAdapter,
    ),
  });
}
