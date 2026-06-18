import { APP_DIALOG_IDS } from "../../contracts/app-contract.js";

export const GLOSSARY_DOM_IDS = Object.freeze({
  triggerButton: "glossary-btn",
  dialog: APP_DIALOG_IDS.glossaryManager,
  closeButton: "glossary-close-btn",
  newButton: "glossary-new-btn",
  list: "glossary-list",
  listEmpty: "glossary-list-empty",
  nameInput: "glossary-name",
  addRowButton: "glossary-add-row-btn",
  importButton: "glossary-import-btn",
  exportButton: "glossary-export-btn",
  deleteButton: "glossary-delete-btn",
  entries: "glossary-entries",
  entriesEmpty: "glossary-entries-empty",
  importPanel: "glossary-import-panel",
  csvText: "glossary-csv-text",
  importApplyButton: "glossary-import-apply-btn",
  importCancelButton: "glossary-import-cancel-btn",
  status: "glossary-status",
  saveButton: "glossary-save-btn",
});

export const GLOSSARY_SELECTORS = Object.freeze({
  listItem: ".glossary-list-item",
  entryRow: ".glossary-entry-row",
  entrySource: ".glossary-entry-source",
  entryTarget: ".glossary-entry-target",
  entryNote: ".glossary-entry-note",
  entryLevel: ".glossary-entry-level",
  entryMatch: ".glossary-entry-match",
  entryRemove: ".glossary-entry-remove",
});

export const GLOSSARY_DATASET = Object.freeze({
  hydrated: "hydrated",
  glossaryId: "glossaryId",
});
