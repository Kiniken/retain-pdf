import { $ } from "../dom/query.js";
import { APP_EVENTS } from "../contracts/app-contract.js";

export function statusAreaElement() {
  return $("status-section");
}

export function statusCardElement() {
  return $("job-status-card") || document.querySelector("job-status-card");
}

export function isStatusAreaVisible() {
  return !statusAreaElement()?.classList.contains("hidden");
}

export function setStatusAreaVisible(visible) {
  statusAreaElement()?.classList.toggle("hidden", !visible);
  statusCardElement()?.classList.toggle("hidden", !visible);
  document.dispatchEvent(new CustomEvent(APP_EVENTS.statusAreaVisibilityChanged));
}

export function dispatchReturnHomeFromStatusArea() {
  const target = statusCardElement() || statusAreaElement();
  target?.dispatchEvent(new CustomEvent(APP_EVENTS.returnHome, { bubbles: true }));
}
