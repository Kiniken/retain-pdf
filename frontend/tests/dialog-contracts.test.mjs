import test from "node:test";
import assert from "node:assert/strict";

import { readerDialogTemplate } from "../src/js/components/dialogs/reader-dialog-template.js";
import { aiAssistantDialogTemplate } from "../src/js/components/dialogs/ai-assistant-dialog-template.js";
import {
  AI_ASSISTANT_DIALOG_ELEMENT,
  AI_ASSISTANT_DIALOG_IDS,
} from "../src/js/components/dialogs/ai-assistant-dialog-contract.js";
import { appSettingsDialogTemplate } from "../src/js/components/dialogs/app-settings-dialog-template.js";
import {
  APP_SETTINGS_DIALOG_ELEMENT,
  APP_SETTINGS_DIALOG_IDS,
} from "../src/js/components/dialogs/app-settings-dialog-contract.js";
import { glossaryManagerDialogTemplate } from "../src/js/components/dialogs/glossary-manager-dialog-template.js";
import { statusDetailDialogTemplate } from "../src/js/components/dialogs/status-detail-dialog-template.js";
import {
  dataAttribute,
  STATUS_DETAIL_DIALOG,
} from "../src/js/components/dialogs/status-detail-dialog-dom-contract.js";
import {
  GLOSSARY_DATASET,
  GLOSSARY_DOM_IDS,
  GLOSSARY_SELECTORS,
} from "../src/js/features/glossaries/glossary-dom-contract.js";
import {
  READER_DIALOG_BUTTON_IDS,
  READER_DIALOG_CLASSES,
  READER_DIALOG_DATASETS,
  READER_DIALOG_DATASET_VALUES,
  READER_DIALOG_ELEMENT,
  READER_DIALOG_IDS,
  readerDialogLinkOpenState,
} from "../src/js/components/dialogs/reader-dialog-contract.js";
import {
  READER_DIALOG_MESSAGES,
  READER_DIALOG_BUTTON_IDS as FEATURE_READER_DIALOG_BUTTON_IDS,
  READER_DIALOG_IDS as FEATURE_READER_DIALOG_IDS,
} from "../src/js/features/reader-dialog/contract.js";
import {
  APP_DIALOG_IDS,
} from "../src/js/contracts/app-contract.js";
import {
  DOWNLOAD_ACTION_IDS,
} from "../src/js/contracts/download-action-contract.js";
import {
  setReaderLoadingProgress,
  setReaderToolbarButtonState,
} from "../src/js/features/reader-dialog/view.js";
import { createReaderDialogConfigPort } from "../src/js/features/reader-dialog/config-port.js";
import {
  getLegacyReaderToolbarButtonUrl,
  setLegacyReaderToolbarButtonState,
} from "../src/js/features/reader-dialog/legacy-dom-adapter.js";
import { mountDeveloperFeature } from "../src/js/features/developer/controller.js";
import { createDeveloperViewPort } from "../src/js/features/developer/developer-view-port.js";

test("reader dialog template exposes ids from the shared contract", () => {
  const markup = readerDialogTemplate();
  for (const id of [
    READER_DIALOG_IDS.dialog,
    READER_DIALOG_IDS.frame,
    READER_DIALOG_IDS.closeButton,
    READER_DIALOG_IDS.loading,
    READER_DIALOG_IDS.loadingText,
    READER_DIALOG_IDS.loadingPercent,
    READER_DIALOG_IDS.loadingBar,
  ]) {
    assert.match(markup, new RegExp(`id="${id}"`));
  }
  // 下载入口已移入阅读器本体(reader.html 动作组),宿主头部只保留关闭
  assert.doesNotMatch(markup, /reader-dialog-download-menu/);
  for (const id of [
    READER_DIALOG_BUTTON_IDS.source,
    READER_DIALOG_BUTTON_IDS.merged,
    READER_DIALOG_BUTTON_IDS.translated,
  ]) {
    assert.doesNotMatch(markup, new RegExp(`id="${id}"`));
  }
  assert.equal(READER_DIALOG_MESSAGES.progress, "retainpdf-reader-progress");
  assert.equal(READER_DIALOG_ELEMENT.hostSelector, "reader-dialog");
  assert.equal(READER_DIALOG_DATASETS.hydrated, "hydrated");
  assert.equal(READER_DIALOG_DATASET_VALUES.hydrated, "1");
  assert.equal(FEATURE_READER_DIALOG_IDS.dialog, READER_DIALOG_IDS.dialog);
  assert.equal(FEATURE_READER_DIALOG_BUTTON_IDS.source, READER_DIALOG_BUTTON_IDS.source);
});

test("ai assistant dialog template exposes static component contract", () => {
  const markup = aiAssistantDialogTemplate();

  assert.equal(AI_ASSISTANT_DIALOG_ELEMENT.tagName, "ai-assistant-dialog");
  for (const id of [
    AI_ASSISTANT_DIALOG_IDS.dialog,
    AI_ASSISTANT_DIALOG_IDS.closeButton,
    AI_ASSISTANT_DIALOG_IDS.input,
    AI_ASSISTANT_DIALOG_IDS.submitButton,
  ]) {
    assert.match(markup, new RegExp(`id="${id}"`));
  }
  assert.match(markup, /AI 问答/);
  assert.match(markup, /问答 API 尚未接入/);
});

test("app settings dialog template groups api glossary and update actions", () => {
  const markup = appSettingsDialogTemplate();

  assert.equal(APP_SETTINGS_DIALOG_ELEMENT.tagName, "app-settings-dialog");
  for (const id of [
    APP_SETTINGS_DIALOG_IDS.dialog,
    APP_SETTINGS_DIALOG_IDS.closeButton,
    "credentials-btn",
    "glossary-btn",
    "app-update-btn",
  ]) {
    assert.match(markup, new RegExp(`id="${id}"`));
  }
  assert.match(markup, /API 设置/);
  assert.match(markup, /词表/);
  assert.match(markup, /更新/);
});

test("reader dialog link open state uses the shared external trigger contract", () => {
  const classes = new Set([READER_DIALOG_CLASSES.disabled]);
  const link = {
    dataset: {
      [READER_DIALOG_DATASETS.url]: "./reader.html?job_id=job-reader",
    },
    disabled: false,
    classList: {
      contains(name) {
        return classes.has(name);
      },
    },
    getAttribute(name) {
      return name === "aria-disabled" ? "false" : "";
    },
  };

  assert.deepEqual(readerDialogLinkOpenState(link), {
    url: "./reader.html?job_id=job-reader",
    disabled: true,
  });

  classes.clear();
  link.disabled = true;
  assert.deepEqual(readerDialogLinkOpenState({ currentTarget: link }), {
    url: "./reader.html?job_id=job-reader",
    disabled: true,
  });
});

test("reader dialog config port owns reader URLs and message trust", () => {
  const trustCalls = [];
  const port = createReaderDialogConfigPort({
    buildPageUrl(path, params) {
      return `app://${path}?job_id=${params.job_id}`;
    },
    trustWindowMessage(event, source) {
      trustCalls.push([event.origin, source]);
      return event.origin === "app://retainpdf";
    },
    locationProvider: () => ({
      href: "http://localhost/index.html?view=reader&job_id=job-123",
    }),
  });

  assert.equal(port.buildReaderPageUrl("job-123"), "app://./reader.html?job_id=job-123");
  assert.equal(port.buildReaderPageUrl(""), "");
  assert.equal(
    port.buildReaderRouteUrl("job-456"),
    "http://localhost/index.html?view=reader&job_id=job-456",
  );
  assert.equal(port.buildReaderRouteUrl(""), "http://localhost/index.html");
  assert.equal(port.requestedReaderJobIdFromLocation(), "job-123");
  assert.equal(port.isTrustedReaderMessage({ origin: "app://retainpdf" }, "frame"), true);
  assert.deepEqual(trustCalls, [["app://retainpdf", "frame"]]);
});

test("reader dialog config port ignores location job id outside reader view", () => {
  const port = createReaderDialogConfigPort({
    locationProvider: () => ({
      href: "http://localhost/index.html?view=library&job_id=job-123",
    }),
  });

  assert.equal(port.requestedReaderJobIdFromLocation(), "");
});

test("reader dialog view prefers component methods over global DOM fallback", () => {
  const previousDocument = global.document;
  const calls = [];
  global.document = {
    querySelector(selector) {
      assert.equal(selector, READER_DIALOG_ELEMENT.hostSelector);
      return {
        setToolbarButtonState(id, payload) {
          calls.push(["toolbar", id, payload]);
        },
        setLoadingProgress(payload) {
          calls.push(["progress", payload]);
        },
      };
    },
    getElementById(id) {
      throw new Error(`reader dialog global DOM fallback should not be used for ${id}`);
    },
  };

  try {
    setReaderToolbarButtonState(READER_DIALOG_BUTTON_IDS.source, true, "/source.pdf");
    setReaderLoadingProgress({ value: 42, target: 42, rafId: 0 }, 42, "Loading");

    assert.deepEqual(calls, [
      ["toolbar", READER_DIALOG_BUTTON_IDS.source, { enabled: true, url: "/source.pdf" }],
      ["progress", { text: "Loading", percent: 42 }],
      ["progress", { widthPercent: 42 }],
    ]);
  } finally {
    global.document = previousDocument;
  }
});

test("reader dialog legacy DOM adapter owns fallback toolbar state", () => {
  const previousDocument = global.document;
  const button = {
    disabled: false,
    dataset: {},
  };
  global.document = {
    getElementById(id) {
      return id === READER_DIALOG_BUTTON_IDS.source ? button : null;
    },
  };

  try {
    setLegacyReaderToolbarButtonState(READER_DIALOG_BUTTON_IDS.source, true, "/source.pdf");
    assert.equal(button.disabled, false);
    assert.equal(button.dataset[READER_DIALOG_DATASETS.url], "/source.pdf");
    assert.equal(getLegacyReaderToolbarButtonUrl(READER_DIALOG_BUTTON_IDS.source), "/source.pdf");

    setLegacyReaderToolbarButtonState(READER_DIALOG_BUTTON_IDS.source, false);
    assert.equal(button.disabled, true);
    assert.equal(button.dataset[READER_DIALOG_DATASETS.url], "");
  } finally {
    global.document = previousDocument;
  }
});

test("developer feature routes dialog navigation through view port", () => {
  const calls = [];
  let commands = null;
  const feature = mountDeveloperFeature({
    viewPort: createDeveloperViewPort({
      activateTab: (tabName) => calls.push(["tab", tabName]),
      bindEvents: (payload) => {
        calls.push(["bind", typeof payload.openDeveloperDialog]);
        commands = payload;
      },
      openDialog: () => calls.push(["open"]),
    }),
    syncDeveloperDialogFromState: () => calls.push(["sync"]),
    updateDeveloperWorkflowFormState: () => calls.push(["workflow"]),
    saveDeveloperDialog: () => calls.push(["save"]),
    resetDeveloperDialog: () => calls.push(["reset"]),
  });

  feature.bindEvents();
  feature.showDeveloperSettingsDialog();
  commands.activateDeveloperTab("runtime");
  commands.saveDeveloperDialog();
  commands.resetDeveloperDialog();
  commands.updateDeveloperWorkflowFormState();

  assert.deepEqual(calls, [
    ["bind", "function"],
    ["sync"],
    ["tab", "model"],
    ["open"],
    ["tab", "runtime"],
    ["save"],
    ["reset"],
    ["workflow"],
  ]);
});

test("status detail dialog template exposes ids and selectors from the shared contract", () => {
  const markup = statusDetailDialogTemplate();
  const ids = STATUS_DETAIL_DIALOG.ids;
  const expectedIds = [
    STATUS_DETAIL_DIALOG.dialogId,
    ids.headline.icon,
    ids.headline.jobId,
    ids.headline.note,
    ids.headline.closeButton,
    ids.tabs.overview,
    ids.tabs.failure,
    ids.tabs.events,
    ids.tabs.translation,
    ids.panels.overview,
    ids.panels.failure,
    ids.panels.events,
    ids.panels.translation,
    DOWNLOAD_ACTION_IDS.MARKDOWN_BUNDLE,
    ids.runtime.currentStage,
    ids.runtime.stageElapsed,
    ids.runtime.totalElapsed,
    ids.failure.rerunButton,
    ids.failure.rerunStatus,
    ids.events.status,
    ids.events.empty,
    ids.events.list,
    ids.translation.debugStatus,
    ids.translation.filterFinalStatus,
    ids.translation.filterApply,
    ids.translation.itemsList,
    ids.translation.itemReplay,
    ids.translation.replayResult,
  ];

  for (const id of expectedIds) {
    assert.match(markup, new RegExp(`id="${id}"`));
  }
  assert.match(markup, new RegExp(`data-${STATUS_DETAIL_DIALOG.dataset.tab}="overview"`));
  assert.match(markup, new RegExp(`data-${STATUS_DETAIL_DIALOG.dataset.panel}="translation"`));
  assert.equal(STATUS_DETAIL_DIALOG.selectors.openButton, "#status-detail-btn");
  assert.equal(STATUS_DETAIL_DIALOG.selectors.translationItem, "[data-translation-item-id]");
  assert.equal(dataAttribute(STATUS_DETAIL_DIALOG.dataset.translationItemId), "translation-item-id");
});

test("glossary manager dialog template exposes ids from the shared contract", () => {
  const markup = glossaryManagerDialogTemplate();
  for (const id of [
    GLOSSARY_DOM_IDS.dialog,
    GLOSSARY_DOM_IDS.closeButton,
    GLOSSARY_DOM_IDS.newButton,
    GLOSSARY_DOM_IDS.list,
    GLOSSARY_DOM_IDS.listEmpty,
    GLOSSARY_DOM_IDS.nameInput,
    GLOSSARY_DOM_IDS.addRowButton,
    GLOSSARY_DOM_IDS.importButton,
    GLOSSARY_DOM_IDS.exportButton,
    GLOSSARY_DOM_IDS.deleteButton,
    GLOSSARY_DOM_IDS.entries,
    GLOSSARY_DOM_IDS.entriesEmpty,
    GLOSSARY_DOM_IDS.importPanel,
    GLOSSARY_DOM_IDS.csvText,
    GLOSSARY_DOM_IDS.importApplyButton,
    GLOSSARY_DOM_IDS.importCancelButton,
    GLOSSARY_DOM_IDS.status,
    GLOSSARY_DOM_IDS.saveButton,
  ]) {
    assert.match(markup, new RegExp(`id="${id}"`));
  }

  assert.equal(GLOSSARY_DOM_IDS.dialog, APP_DIALOG_IDS.glossaryManager);
  assert.equal(GLOSSARY_DATASET.glossaryId, "glossaryId");
  assert.equal(GLOSSARY_SELECTORS.listItem, ".glossary-list-item");
  assert.equal(GLOSSARY_SELECTORS.entryRemove, ".glossary-entry-remove");
});
