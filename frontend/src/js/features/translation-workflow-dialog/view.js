import { $ } from "../../dom/query.js";
import {
  APP_SHELL_IDS,
} from "../../contracts/app-contract.js";
import {
  TRANSLATION_WORKFLOW_MODES,
  TRANSLATION_WORKFLOW_DIALOG,
} from "./contract.js";
import {
  createTranslationWorkflowDialogStatePort,
} from "./state.js";

export function translationWorkflowDialogElement() {
  return $(TRANSLATION_WORKFLOW_DIALOG.ids.dialog);
}

export function translationWorkflowCloseButtonElement() {
  return $(TRANSLATION_WORKFLOW_DIALOG.ids.closeButton);
}

export function translationWorkflowTriggerElement() {
  return $(APP_SHELL_IDS.libraryAddPdfButton);
}

export function isTranslationWorkflowDialogOpen() {
  return translationWorkflowDialogElement()?.dataset[TRANSLATION_WORKFLOW_DIALOG.datasets.open]
    === TRANSLATION_WORKFLOW_DIALOG.datasetValues.open;
}

function modeFromStatusArea(options = {}) {
  if (options.mode === TRANSLATION_WORKFLOW_MODES.STATUS || options.mode === TRANSLATION_WORKFLOW_MODES.UPLOAD) {
    return options.mode;
  }
  return options.statusAreaPort?.isVisible?.()
    ? TRANSLATION_WORKFLOW_MODES.STATUS
    : TRANSLATION_WORKFLOW_MODES.UPLOAD;
}

function statePortFromOptions(options = {}) {
  return options.dialogStatePort || createTranslationWorkflowDialogStatePort({
    homeStatePort: options.homeStatePort,
  });
}

export function applyTranslationWorkflowDialogSnapshot(snapshot = {}) {
  const dialog = translationWorkflowDialogElement();
  const title = $(TRANSLATION_WORKFLOW_DIALOG.ids.title);
  const trigger = translationWorkflowTriggerElement();
  if (!dialog) {
    return;
  }
  const open = Boolean(snapshot.open);
  const statusMode = snapshot.mode === TRANSLATION_WORKFLOW_MODES.STATUS;
  const mode = statusMode ? TRANSLATION_WORKFLOW_MODES.STATUS : TRANSLATION_WORKFLOW_MODES.UPLOAD;
  dialog.classList.toggle(TRANSLATION_WORKFLOW_DIALOG.classes.hidden, !open);
  dialog.classList.toggle(TRANSLATION_WORKFLOW_DIALOG.classes.statusMode, statusMode);
  dialog.classList.toggle(TRANSLATION_WORKFLOW_DIALOG.classes.uploadMode, !statusMode);
  dialog.dataset[TRANSLATION_WORKFLOW_DIALOG.datasets.open] = open
    ? TRANSLATION_WORKFLOW_DIALOG.datasetValues.open
    : TRANSLATION_WORKFLOW_DIALOG.datasetValues.closed;
  document.documentElement.classList.toggle(TRANSLATION_WORKFLOW_DIALOG.classes.rootOpen, open);
  if (trigger) {
    trigger.classList.toggle("is-active", open);
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    trigger.dataset.workflowOpen = open
      ? TRANSLATION_WORKFLOW_DIALOG.datasetValues.open
      : TRANSLATION_WORKFLOW_DIALOG.datasetValues.closed;
    trigger.dataset.workflowMode = mode;
  }
  if (title) {
    title.textContent = statusMode
      ? TRANSLATION_WORKFLOW_DIALOG.copy.statusTitle
      : TRANSLATION_WORKFLOW_DIALOG.copy.uploadTitle;
  }
}

export function syncTranslationWorkflowDialogMode(options = {}) {
  const dialog = translationWorkflowDialogElement();
  if (!dialog) {
    return;
  }
  const statePort = statePortFromOptions(options);
  const next = statePort.setMode(modeFromStatusArea(options));
  applyTranslationWorkflowDialogSnapshot(next);
}

export function openTranslationWorkflowDialogView(options = {}) {
  const dialog = translationWorkflowDialogElement();
  if (!dialog) {
    return;
  }
  const snapshot = statePortFromOptions(options).open(modeFromStatusArea(options));
  applyTranslationWorkflowDialogSnapshot(snapshot);
}

export function closeTranslationWorkflowDialogView(options = {}) {
  const dialog = translationWorkflowDialogElement();
  if (!dialog) {
    return;
  }
  const snapshot = statePortFromOptions(options).close();
  applyTranslationWorkflowDialogSnapshot(snapshot);
}
