import { resolveJobActions } from "../job/actions.js";

export function buildStatusCardTaskActions({
  job = null,
} = {}) {
  const actions = resolveJobActions(job);
  return {
    cancelEnabled: actions.cancelEnabled && Boolean(actions.cancel),
  };
}
