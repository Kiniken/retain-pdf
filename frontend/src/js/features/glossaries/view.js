import { $ } from "../../dom/query.js";
import {
  APP_EVENTS,
} from "../../contracts/app-contract.js";
import {
  GLOSSARY_DATASET,
  GLOSSARY_DOM_IDS,
  GLOSSARY_SELECTORS,
} from "./glossary-dom-contract.js";

const ENTRY_LEVEL_OPTIONS = [
  ["preserve", "保留"],
  ["canonical", "固定译法"],
  ["preferred", "偏好译法"],
];

const MATCH_MODE_OPTIONS = [
  ["case_insensitive", "忽略大小写"],
  ["exact", "精确"],
  ["regex", "正则"],
];

export function openGlossaryDialogView() {
  const dialog = $(GLOSSARY_DOM_IDS.dialog);
  if (!dialog || dialog.open) {
    return;
  }
  dialog.showModal();
}

export function closeGlossaryDialogView() {
  $(GLOSSARY_DOM_IDS.dialog)?.close();
}

export function setGlossaryStatus(message = "", tone = "") {
  const el = $(GLOSSARY_DOM_IDS.status);
  if (!el) {
    return;
  }
  const content = `${message || ""}`.trim();
  el.textContent = content;
  el.classList.toggle("hidden", !content);
  el.classList.toggle("is-valid", tone === "valid");
  el.classList.toggle("is-error", tone === "error");
}

export function renderGlossaryList(items = [], selectedId = "") {
  const list = $(GLOSSARY_DOM_IDS.list);
  const empty = $(GLOSSARY_DOM_IDS.listEmpty);
  if (!list || !empty) {
    return;
  }
  list.textContent = "";
  const normalizedSelectedId = `${selectedId || ""}`.trim();
  empty.classList.toggle("hidden", items.length > 0);
  for (const item of items) {
    const glossaryId = `${item?.glossary_id || ""}`.trim();
    if (!glossaryId) {
      continue;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = GLOSSARY_SELECTORS.listItem.slice(1);
    button.dataset[GLOSSARY_DATASET.glossaryId] = glossaryId;
    button.classList.toggle("is-active", glossaryId === normalizedSelectedId);
    const name = document.createElement("strong");
    name.textContent = item.name || glossaryId;
    const meta = document.createElement("span");
    meta.textContent = `${Number(item.entry_count) || 0} 条`;
    button.append(name, meta);
    list.append(button);
  }
}

function buildOption(value, label, selectedValue) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = value === selectedValue;
  return option;
}

function createSelect(options, selectedValue, className) {
  const select = document.createElement("select");
  select.className = className;
  for (const [value, label] of options) {
    select.append(buildOption(value, label, selectedValue));
  }
  return select;
}

function createTextInput(value, className, placeholder = "") {
  const input = document.createElement("input");
  input.type = "text";
  input.className = className;
  input.value = `${value || ""}`;
  input.placeholder = placeholder;
  return input;
}

export function renderGlossaryEditor({ name = "", entries = [] } = {}) {
  const nameInput = $(GLOSSARY_DOM_IDS.nameInput);
  const tbody = $(GLOSSARY_DOM_IDS.entries);
  const empty = $(GLOSSARY_DOM_IDS.entriesEmpty);
  if (nameInput) {
    nameInput.value = name;
  }
  if (!tbody || !empty) {
    return;
  }
  tbody.textContent = "";
  empty.classList.toggle("hidden", entries.length > 0);
  for (const entry of entries) {
    appendGlossaryEntryRow(entry);
  }
}

export function appendGlossaryEntryRow(entry = {}) {
  const tbody = $(GLOSSARY_DOM_IDS.entries);
  const empty = $(GLOSSARY_DOM_IDS.entriesEmpty);
  if (!tbody) {
    return;
  }
  const tr = document.createElement("tr");
  tr.className = GLOSSARY_SELECTORS.entryRow.slice(1);

  const sourceCell = document.createElement("td");
  sourceCell.append(createTextInput(entry.source, GLOSSARY_SELECTORS.entrySource.slice(1), "Hartree-Fock"));

  const targetCell = document.createElement("td");
  targetCell.append(createTextInput(entry.target, GLOSSARY_SELECTORS.entryTarget.slice(1), "可留空"));

  const noteCell = document.createElement("td");
  noteCell.append(createTextInput(entry.note, GLOSSARY_SELECTORS.entryNote.slice(1), "可选"));

  const levelCell = document.createElement("td");
  levelCell.append(createSelect(ENTRY_LEVEL_OPTIONS, entry.level || "preserve", GLOSSARY_SELECTORS.entryLevel.slice(1)));

  const matchCell = document.createElement("td");
  matchCell.append(createSelect(MATCH_MODE_OPTIONS, entry.match_mode || "case_insensitive", GLOSSARY_SELECTORS.entryMatch.slice(1)));

  const actionCell = document.createElement("td");
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = `${GLOSSARY_SELECTORS.entryRemove.slice(1)} secondary`;
  removeButton.setAttribute("aria-label", "删除词条");
  removeButton.textContent = "×";
  actionCell.append(removeButton);

  tr.append(sourceCell, targetCell, noteCell, levelCell, matchCell, actionCell);
  tbody.append(tr);
  empty?.classList.add("hidden");
}

export function readGlossaryEditorPayload() {
  const entries = [];
  const skippedMissingTarget = [];
  $(GLOSSARY_DOM_IDS.entries)?.querySelectorAll(GLOSSARY_SELECTORS.entryRow).forEach((row) => {
    const source = row.querySelector(GLOSSARY_SELECTORS.entrySource)?.value?.trim() || "";
    if (!source) {
      return;
    }
    const level = row.querySelector(GLOSSARY_SELECTORS.entryLevel)?.value || "preserve";
    const typedTarget = row.querySelector(GLOSSARY_SELECTORS.entryTarget)?.value?.trim() || "";
    const target = typedTarget || (level === "preserve" ? source : "");
    if (!target) {
      skippedMissingTarget.push(source);
      return;
    }
    entries.push({
      source,
      target,
      level,
      match_mode: row.querySelector(GLOSSARY_SELECTORS.entryMatch)?.value || "case_insensitive",
      context: "",
      note: row.querySelector(GLOSSARY_SELECTORS.entryNote)?.value?.trim() || "",
    });
  });
  return {
    name: $(GLOSSARY_DOM_IDS.nameInput)?.value?.trim() || "未命名术语表",
    entries,
    skippedMissingTarget,
  };
}

export function setGlossaryImportVisible(visible) {
  $(GLOSSARY_DOM_IDS.importPanel)?.classList.toggle("hidden", !visible);
}

export function readGlossaryCsvText() {
  return $(GLOSSARY_DOM_IDS.csvText)?.value || "";
}

export function clearGlossaryCsvText() {
  if ($(GLOSSARY_DOM_IDS.csvText)) {
    $(GLOSSARY_DOM_IDS.csvText).value = "";
  }
}

export function bindGlossaryViewEvents({
  open,
  close,
  reload,
  selectGlossary,
  createNew,
  addRow,
  save,
  deleteCurrent,
  exportCurrent,
  showImport,
  hideImport,
  applyImport,
}) {
  $(GLOSSARY_DOM_IDS.triggerButton)?.addEventListener("click", open);
  $(GLOSSARY_DOM_IDS.closeButton)?.addEventListener("click", close);
  $(GLOSSARY_DOM_IDS.newButton)?.addEventListener("click", createNew);
  $(GLOSSARY_DOM_IDS.addRowButton)?.addEventListener("click", addRow);
  $(GLOSSARY_DOM_IDS.saveButton)?.addEventListener("click", save);
  $(GLOSSARY_DOM_IDS.deleteButton)?.addEventListener("click", deleteCurrent);
  $(GLOSSARY_DOM_IDS.exportButton)?.addEventListener("click", exportCurrent);
  $(GLOSSARY_DOM_IDS.importButton)?.addEventListener("click", showImport);
  $(GLOSSARY_DOM_IDS.importCancelButton)?.addEventListener("click", hideImport);
  $(GLOSSARY_DOM_IDS.importApplyButton)?.addEventListener("click", applyImport);
  $(GLOSSARY_DOM_IDS.list)?.addEventListener("click", (event) => {
    const button = event.target?.closest?.(GLOSSARY_SELECTORS.listItem);
    if (button?.dataset[GLOSSARY_DATASET.glossaryId]) {
      selectGlossary(button.dataset[GLOSSARY_DATASET.glossaryId]);
    }
  });
  $(GLOSSARY_DOM_IDS.entries)?.addEventListener("click", (event) => {
    const button = event.target?.closest?.(GLOSSARY_SELECTORS.entryRemove);
    if (!button) {
      return;
    }
    button.closest(GLOSSARY_SELECTORS.entryRow)?.remove();
    const hasRows = Boolean($(GLOSSARY_DOM_IDS.entries)?.querySelector(GLOSSARY_SELECTORS.entryRow));
    $(GLOSSARY_DOM_IDS.entriesEmpty)?.classList.toggle("hidden", hasRows);
  });
  document.addEventListener(APP_EVENTS.refreshGlossaries, () => reload?.());
}
