import { $ } from "../dom/query.js";
import {
  setStatusAreaVisible,
  statusCardElement,
} from "./status-area-view.js";
import { STATUS_CARD_IDS } from "../components/status/job-status-card-dom-contract.js";
import { APP_DIALOG_IDS } from "../contracts/app-contract.js";

export function setTextView(id, value) {
  const el = $(id);
  if (el) {
    el.textContent = value;
  }
}

export function setInputValueView(id, value) {
  const el = $(id);
  if (el) {
    el.value = value;
  }
}

export function statusSectionStatus() {
  return statusCardElement()?.getAttribute("data-status") || "";
}

export function setStatusView(status) {
  const normalized = status || "idle";
  statusCardElement()?.setAttribute("data-status", normalized);
  const el = $("job-status");
  if (el) {
    el.textContent = normalized;
    el.className = `badge ${normalized}`;
  }
}

export function setStatusCardElapsed(value) {
  const statusCard = statusCardElement();
  if (statusCard?.setElapsed) {
    statusCard.setElapsed(value);
    return;
  }
  setTextView(STATUS_CARD_IDS.ringElapsed, value);
}

export function setWorkflowSectionsView({ hasJob, processing }) {
  const shell = $("app-shell");
  setStatusAreaVisible(hasJob);
  shell?.classList.remove("processing-mode", "result-mode");
}

export function setJobWarningVisible(visible) {
  $("job-warning")?.classList.toggle("hidden", !visible);
}

export function renderStatusRingFallback({
  label,
  value,
  stageKey,
  pdfReady,
  readerReady,
}) {
  const statusCard = statusCardElement();
  if (statusCard?.setStagePresentation) {
    statusCard.setStagePresentation({ label, value, stageKey });
  } else {
    setTextView(STATUS_CARD_IDS.ringLabel, label);
    setTextView(STATUS_CARD_IDS.ringValue, value);
  }

  if (statusCard?.syncPrimaryActions) {
    statusCard.syncPrimaryActions({ pdfReady, readerReady });
    return;
  }

  const pdfBtn = $(STATUS_CARD_IDS.pdfButton);
  const readerBtn = $(STATUS_CARD_IDS.readerButton);
  const actionRow = document.querySelector(".status-ring-downloads");
  pdfBtn?.classList.toggle("hidden", !pdfReady);
  readerBtn?.classList.toggle("hidden", !readerReady);
  actionRow?.classList.remove("hidden");
}

export function renderStatusCardSnapshot(snapshot) {
  const statusCard = statusCardElement();
  if (!statusCard?.renderSnapshot) {
    return false;
  }
  statusCard.renderSnapshot(snapshot);
  return true;
}

export function renderStatusDetailSnapshotView(snapshot) {
  const statusDetailDialog = document.querySelector(APP_DIALOG_IDS.statusDetail);
  if (!statusDetailDialog?.renderSnapshot) {
    return false;
  }
  statusDetailDialog.renderSnapshot(snapshot);
  return true;
}
