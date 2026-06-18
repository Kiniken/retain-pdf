export {
  escapeAttribute,
  escapeHtml,
} from "../../utils/html-formatting.js";

import { truncateDisplayName } from "../../utils/html-formatting.js";

export function truncateRecentJobName(value) {
  return truncateDisplayName(value);
}
