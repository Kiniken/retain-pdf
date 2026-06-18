import { $ } from "../dom/query.js";
import {
  STATUS_CARD_ACTION_IDS,
  STATUS_CARD_IDS,
} from "../components/status/job-status-card-dom-contract.js";
import { createConnectedJobStatusCard } from "../components/status/connected-job-status-card.js";
import { statusCardElement } from "./status-area-view.js";

const STATUS_CARD_ACTION_ID_SET = new Set([
  STATUS_CARD_ACTION_IDS.pdf,
  STATUS_CARD_ACTION_IDS.reader,
  STATUS_CARD_ACTION_IDS.sourcePdf,
  STATUS_CARD_ACTION_IDS.markdownBundle,
]);

function statusCardContains(id = "") {
  const el = $(id);
  const statusCard = statusCardElement();
  return Boolean(el && STATUS_CARD_ACTION_ID_SET.has(id) && statusCard?.contains?.(el));
}

function setActionLinkState(id, url, enabled) {
  const el = $(id);
  if (!el) {
    return false;
  }
  el.href = enabled && url ? url : "#";
  el.dataset.url = enabled && url ? url : "";
  el.classList.toggle("disabled", !enabled);
  el.setAttribute("aria-disabled", enabled ? "false" : "true");
  return true;
}

let defaultStatusCard = null;

function renderStatusCardDomSnapshot(snapshot) {
  const statusCard = statusCardElement();
  if (!statusCard?.renderSnapshot) {
    return false;
  }
  statusCard.renderSnapshot(snapshot);
  return true;
}

export function renderStatusCardSnapshot(snapshot) {
  if (!defaultStatusCard) {
    defaultStatusCard = createConnectedJobStatusCard({
      renderSnapshot: renderStatusCardDomSnapshot,
    });
  }
  return defaultStatusCard.render(snapshot);
}

export function resetStatusCardViewPortForTests() {
  defaultStatusCard?.unmount();
  defaultStatusCard = null;
}

export function syncStatusCardPrimaryActions(options = {}) {
  const statusCard = statusCardElement();
  if (statusCard?.syncPrimaryActions) {
    statusCard.syncPrimaryActions(options);
    return true;
  }
  const results = [
    setActionLinkState(STATUS_CARD_ACTION_IDS.markdownBundle, options.markdownBundleUrl, options.markdownBundleReady),
    setActionLinkState(STATUS_CARD_ACTION_IDS.pdf, options.pdfUrl, options.pdfReady),
    setActionLinkState(STATUS_CARD_ACTION_IDS.reader, options.readerUrl, options.readerReady),
    setActionLinkState(STATUS_CARD_ACTION_IDS.sourcePdf, options.sourcePdfUrl, options.sourcePdfReady),
  ];
  return results.some(Boolean);
}

export function setStatusCardActionLink(id, url, enabled) {
  if (statusCardContains(id)) {
    return true;
  }
  return false;
}

export function setStatusCardCancelEnabled(enabled) {
  const statusCard = statusCardElement();
  if (statusCard?.setCancelEnabled) {
    statusCard.setCancelEnabled(enabled);
    return true;
  }
  const button = $(STATUS_CARD_IDS.cancelButton);
  if (button) {
    button.disabled = !enabled;
    return true;
  }
  return false;
}

export function setStatusCardProgress(current, total, fallbackText = "-", percentOverride = null) {
  const statusCard = statusCardElement();
  if (statusCard?.setProgress) {
    statusCard.setProgress({
      current,
      total,
      fallbackText,
      percent: percentOverride,
    });
    return true;
  }
  return false;
}
