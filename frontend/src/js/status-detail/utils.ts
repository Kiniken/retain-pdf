import { isJobTerminal, isTerminalStatus } from "../job/core.js";
import {
  formatEventTimestamp,
  formatRuntimeDuration,
} from "../job/formatters.js";

export {
  clampPositiveMs,
  parseIsoTime,
  resolveLiveDurations,
} from "../job/durations.js";
export {
  resolveStageHistory,
  resolveStageHistoryDuration,
  stageHistoryDisplay,
  summarizeStageName,
} from "../job/stage-history.js";

export function escapeHtml(value) {
  return `${value ?? ""}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export { formatEventTimestamp, formatRuntimeDuration, isJobTerminal, isTerminalStatus };
