import test from "node:test";
import assert from "node:assert/strict";

import {
  APP_DIALOG_BACKDROP_IDS,
  APP_DIALOG_IDS,
  APP_EVENTS,
  APP_SHELL_IDS,
} from "../src/js/contracts/app-contract.js";
import {
  mountHomeFeature,
} from "../src/js/features/home/controller.js";
import {
  createHomeStatePort,
  createHomeStore,
} from "../src/js/features/home/state.js";
import {
  createHomeViewPort,
} from "../src/js/features/home/home-view-port.js";
import {
  createRecentJobsStatePort,
  createRecentJobsStore,
} from "../src/js/features/recent-jobs/state.js";
import { createRecentJobsLibraryRefreshPort } from "../src/js/features/recent-jobs/library-refresh-port.js";
import {
  createRecentJobsCommandPort,
  RECENT_JOBS_COMMANDS,
} from "../src/js/features/recent-jobs/commands.js";
import { bindRecentJobsFeatureEvents } from "../src/js/features/recent-jobs/bindings.js";
import { bindRecentJobsCommandHandlers } from "../src/js/features/recent-jobs/command-handlers.js";
import { hydrateCreatedRecentJob } from "../src/js/features/recent-jobs/created-job-hydration.js";
import {
  createLibraryBooksResource,
  invalidateLibraryBooksResource,
} from "../src/js/features/recent-jobs/library-books-resource.js";
import {
  collectRecentJobsPage,
} from "../src/js/features/recent-jobs/pagination.js";
import { createRecentJobsLoader } from "../src/js/features/recent-jobs/loader.js";
import {
  commitRecentJobsEmpty,
  commitRecentJobsError,
  commitRecentJobsNoMore,
  commitRecentJobsPage,
} from "../src/js/features/recent-jobs/commit.js";
import {
  createLibraryEventPort,
  requestThrottledLibraryRefresh,
} from "../src/js/features/library/library-event-port.js";
import { createRecentJobsRefreshScheduler } from "../src/js/features/recent-jobs/refresh-scheduler.js";
import {
  createActiveLibraryRefreshLoop,
  recentJobsEligibleForActiveRefresh,
} from "../src/js/features/recent-jobs/active-refresh.js";
import {
  createRecentJobsRefreshEnvironment,
} from "../src/js/features/recent-jobs/refresh-environment.js";
import {
  isTranslationWorkflowDialogOpen,
} from "../src/js/features/recent-jobs/workflow-open-port.js";
import { createRecentJobActions } from "../src/js/features/recent-jobs/actions.js";
import { createRecentJobsRuntimePort } from "../src/js/features/recent-jobs/job-runtime-port.js";
import { createRecentJobsReaderPort } from "../src/js/features/recent-jobs/reader-port.js";
import { createRecentJobsNavigationPort } from "../src/js/features/recent-jobs/navigation-port.js";
import {
  recentJobRawImageUrls,
  recentJobProgressPercent,
  isRecentJobActive,
  stageKeyForRecentJobLabel,
  recentJobStageLabel,
  recentJobStatusLabel,
} from "../src/js/features/recent-jobs/card-presenter.js";
import {
  clearRecentJobImageCache,
  loadRecentJobImage,
} from "../src/js/features/recent-jobs/image-loader.js";
import { recentJobImageRefreshUrls } from "../src/js/features/recent-jobs/image-refresh.js";
import {
  buildRecentJobRuntimeSnapshot,
  mergeLibraryJobItem,
} from "../src/js/features/recent-jobs/runtime-item.js";
import { createRecentJobsRuntime } from "../src/js/features/recent-jobs/runtime.js";
import { createRecentJobsRuntimePatches } from "../src/js/features/recent-jobs/runtime-patches.js";
import { createRecentJobsStoreRenderer } from "../src/js/features/recent-jobs/store-renderer.js";
import {
  buildJobImageCandidateUrls,
  normalizeJobImageUrl,
} from "../src/js/api/job-images.js";
import { adaptJobStageSnapshot } from "../src/js/job-status/job-stage-contract-adapter.js";
import {
  RECENT_JOBS_IDS,
  RECENT_JOBS_PRIVATE_KEYS,
  RECENT_JOBS_SELECTORS,
  RECENT_JOBS_TAGS,
} from "../src/js/features/recent-jobs/dom-contract.js";
import {
  hasLegacyRecentJobsElements,
  isLibraryMainViewMounted,
  recentJobsDialogComponent,
  recentJobsElements,
  resolveRecentJobsHost,
} from "../src/js/features/recent-jobs/host.js";
import {
  buildRecentJobsListMarkup,
  renderRecentJobCardElements,
  renderRecentJobsMarkupList,
} from "../src/js/features/recent-jobs/list-rendering.js";
import { bindRecentJobsListEvents } from "../src/js/features/recent-jobs/list-events.js";
import { recentJobCardMarkup } from "../src/js/features/recent-jobs/card-template.js";
import {
  renderRecentJobsList as renderRecentJobsViewList,
} from "../src/js/features/recent-jobs/view.js";
import { createRecentJobsRenderTarget } from "../src/js/features/recent-jobs/render-target.js";
import { createRecentJobsEventTarget } from "../src/js/features/recent-jobs/event-target.js";
import { createRecentJobsViewStateTarget } from "../src/js/features/recent-jobs/view-state-target.js";
import {
  scheduleRecentJobsAutoLoadHostCheck,
  setRecentJobsDialogHostOpen,
  shouldAutoLoadRecentJobs,
  triggerRecentJobsAutoLoad,
} from "../src/js/features/recent-jobs/host-actions.js";
import {
  applyRecentJobsEmptyState,
  applyRecentJobsErrorState,
  applyRecentJobsListState,
  applyRecentJobsLoadMoreLoadingState,
  applyRecentJobsLoadingState,
  RECENT_JOBS_VIEW_TEXT,
} from "../src/js/features/recent-jobs/view-state.js";

const recentJobsStageAdapterPort = { adaptJobStageSnapshot };
import {
  buildRecentJobsSummaryViewModel,
  summarizeRecentJobsInvocationCounts,
} from "../src/js/features/recent-jobs/summary-view-model.js";
import {
  closeTranslationWorkflowDialogView,
  openTranslationWorkflowDialogView,
  translationWorkflowCloseButtonElement,
} from "../src/js/features/translation-workflow-dialog/view.js";
import {
  TRANSLATION_WORKFLOW_DIALOG,
  TRANSLATION_WORKFLOW_MODES,
} from "../src/js/features/translation-workflow-dialog/contract.js";
import { mountTranslationWorkflowDialogFeature } from "../src/js/features/translation-workflow-dialog/controller.js";
import {
  createTranslationWorkflowDialogViewPort,
} from "../src/js/features/translation-workflow-dialog/dialog-view-port.js";
import {
  createTranslationWorkflowDialogStatePort,
  homeViewModeForTranslationWorkflow,
} from "../src/js/features/translation-workflow-dialog/state.js";
import { createInitialState } from "../src/js/state/slices.js";

test("app contract centralizes global retainpdf events and dialog roots", () => {
  assert.deepEqual(
    Object.values(APP_EVENTS).filter((value) => value.startsWith("retainpdf:")).sort(),
    [
      "retainpdf:close-translation-workflow",
      "retainpdf:home-recent-jobs-state-changed",
      "retainpdf:home-view-mode-changed",
      "retainpdf:library-job-created",
      "retainpdf:library-job-updated",
      "retainpdf:library-refresh-requested",
      "retainpdf:open-browser-credentials",
      "retainpdf:open-reader-requested",
      "retainpdf:open-translation-workflow",
      "retainpdf:refresh-glossaries",
      "retainpdf:retry-stage",
      "retainpdf:return-home",
      "retainpdf:status-area-visibility-changed",
      "retainpdf:submit-busy-changed",
      "retainpdf:translation-workflow-sync",
    ],
  );
  assert.deepEqual(APP_DIALOG_BACKDROP_IDS, [
    APP_DIALOG_IDS.recentJobs,
    APP_DIALOG_IDS.developerAuth,
    APP_DIALOG_IDS.developerSettings,
    APP_DIALOG_IDS.glossaryManager,
    APP_DIALOG_IDS.browserCredentials,
    APP_DIALOG_IDS.professionalTranslation,
    APP_DIALOG_IDS.aiAssistant,
    APP_DIALOG_IDS.appSettings,
    APP_DIALOG_IDS.statusDetail,
    APP_DIALOG_IDS.reader,
  ]);
  assert.equal(APP_DIALOG_IDS.aiAssistant, "ai-assistant-dialog");
  assert.equal(APP_DIALOG_IDS.appSettings, "app-settings-dialog");
  assert.equal(APP_DIALOG_IDS.translationWorkflow, "translation-workflow-dialog");
  assert.equal(APP_SHELL_IDS.aiAssistantButton, "ai-assistant-btn");
  assert.equal(APP_SHELL_IDS.appSettingsButton, "app-settings-btn");
  assert.equal(APP_SHELL_IDS.libraryAddPdfButton, "library-add-pdf-btn");
});

test("recent jobs contract centralizes host ids and private callback keys", () => {
  assert.equal(RECENT_JOBS_IDS.libraryView, "library-view");
  assert.equal(RECENT_JOBS_IDS.list, "recent-jobs-list");
  assert.equal(RECENT_JOBS_IDS.openButton, "open-query-btn");
  assert.equal(RECENT_JOBS_IDS.searchInput, "library-search-input");
  assert.equal(RECENT_JOBS_TAGS.dialog, "recent-jobs-dialog");
  assert.equal(RECENT_JOBS_TAGS.card, "recent-job-card");
  assert.equal(RECENT_JOBS_SELECTORS.libraryList, "#library-view #recent-jobs-list");
  assert.equal(RECENT_JOBS_PRIVATE_KEYS.select, "__retainPdfRecentJobSelect");
  assert.equal(RECENT_JOBS_PRIVATE_KEYS.cardBound, "__retainPdfRecentJobCardBound");
});

test("recent job card markup keeps cover-first actions and hides delete confirmation from focus", () => {
  const markup = recentJobCardMarkup({
    job_id: "job-actions",
    title: "Persistent Actions",
    page_count: 12,
    updated_at: "2026-07-02",
    status: "completed",
  });

  assert.match(markup, /class="recent-job-hover-actions"/);
  assert.match(markup, /class="recent-job-hover-btn recent-job-reader"/);
  assert.match(markup, /class="recent-job-delete" aria-label="删除任务" title="删除" aria-expanded="false"/);
  assert.match(markup, /class="recent-job-delete-popover" role="group" aria-label="确认删除" hidden inert/);
  assert.doesNotMatch(markup, /recent-job-card-actions/);
  assert.doesNotMatch(markup, />阅读</);
});

test("recent jobs list actions keep delete confirmation out of focus until delete is opened", () => {
  const classes = new Set(["recent-job-item"]);
  const popover = { hidden: true, inert: true };
  const deleteButton = {
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
  const item = {
    dataset: { jobId: "job-actions" },
    closest(selector) {
      return selector === ".recent-job-item" ? item : null;
    },
    classList: {
      contains(name) {
        return classes.has(name);
      },
      toggle(name, force) {
        const shouldHave = force === undefined ? !classes.has(name) : Boolean(force);
        if (shouldHave) {
          classes.add(name);
        } else {
          classes.delete(name);
        }
        return shouldHave;
      },
      remove(name) {
        classes.delete(name);
      },
    },
    querySelector(selector) {
      if (selector === ".recent-job-delete") {
        return deleteButton;
      }
      if (selector === ".recent-job-delete-popover") {
        return popover;
      }
      return null;
    },
  };
  const targets = {
    delete: {
      closest(selector) {
        if (selector === ".recent-job-delete" || selector === ".recent-job-item") {
          return selector === ".recent-job-delete" ? targets.delete : item;
        }
        return null;
      },
    },
    reader: {
      closest(selector) {
        if (selector === ".recent-job-reader" || selector === ".recent-job-item") {
          return selector === ".recent-job-reader" ? targets.reader : item;
        }
        return null;
      },
    },
    confirm: {
      closest(selector) {
        if (selector === ".recent-job-delete-confirm" || selector === ".recent-job-item") {
          return selector === ".recent-job-delete-confirm" ? targets.confirm : item;
        }
        return null;
      },
    },
  };
  const listeners = new Map();
  const list = {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    contains(node) {
      return node === item || Object.values(targets).includes(node);
    },
    querySelectorAll(selector) {
      return selector === ".recent-job-item.is-confirming-delete" && classes.has("is-confirming-delete") ? [item] : [];
    },
  };
  const selected = [];
  const opened = [];
  const deleted = [];

  bindRecentJobsListEvents(list, {
    onSelect: (jobId) => selected.push(jobId),
    onReader: (jobId) => opened.push(jobId),
    onDelete: (jobId) => deleted.push(jobId),
  });
  const click = listeners.get("click");
  const eventFor = (target) => ({
    target,
    preventDefault() {},
    stopPropagation() {},
  });

  click(eventFor(targets.delete));
  assert.equal(classes.has("is-confirming-delete"), true);
  assert.equal(popover.hidden, false);
  assert.equal(popover.inert, false);
  assert.equal(deleteButton.attributes["aria-expanded"], "true");

  click(eventFor(item));
  assert.deepEqual(selected, ["job-actions"]);
  assert.equal(popover.hidden, true);
  assert.equal(popover.inert, true);
  assert.equal(deleteButton.attributes["aria-expanded"], "false");

  click(eventFor(targets.delete));
  click(eventFor(targets.reader));
  assert.deepEqual(opened, ["job-actions"]);
  assert.equal(popover.hidden, true);

  click(eventFor(targets.delete));
  click(eventFor(targets.confirm));
  assert.deepEqual(deleted, ["job-actions"]);
  assert.equal(popover.inert, true);
});

test("translation workflow view owns close button lookup", () => {
  const previousDocument = global.document;
  const closeButton = {};
  global.document = {
    getElementById(id) {
      return id === TRANSLATION_WORKFLOW_DIALOG.ids.closeButton ? closeButton : null;
    },
  };
  try {
    assert.equal(translationWorkflowCloseButtonElement(), closeButton);
  } finally {
    global.document = previousDocument;
  }
});

test("recent jobs host prefers library main view over dialog component", () => {
  const list = {};
  const empty = {};
  const loadMoreButton = {};
  const summary = {};
  const scrollBody = {};
  const libraryRoot = {
    querySelector(selector) {
      return {
        "#recent-jobs-list": list,
        "#recent-jobs-empty": empty,
        "#load-more-jobs-btn": loadMoreButton,
        "#recent-jobs-summary": summary,
        "#recent-jobs-scroll-body": scrollBody,
      }[selector] || null;
    },
  };
  const dialogComponent = { marker: "dialog" };
  const doc = {
    querySelector(selector) {
      return {
        "#library-view": libraryRoot,
        "#library-view #recent-jobs-list": list,
        "recent-jobs-dialog": dialogComponent,
      }[selector] || null;
    },
  };

  assert.equal(isLibraryMainViewMounted(doc), true);
  assert.equal(recentJobsDialogComponent(doc), null);
  assert.equal(hasLegacyRecentJobsElements(doc), true);
  assert.deepEqual(recentJobsElements(doc), {
    root: libraryRoot,
    list,
    empty,
    summary,
    loadMoreButton,
    scrollBody,
  });
  assert.deepEqual(resolveRecentJobsHost(doc), {
    kind: "library",
    component: null,
    elements: {
      root: libraryRoot,
      list,
      empty,
      summary,
      loadMoreButton,
      scrollBody,
    },
    libraryMounted: true,
    legacyMounted: true,
    hasView: true,
  });
});

test("recent jobs host resolver classifies component legacy and missing hosts", () => {
  const list = {};
  const empty = {};
  const loadMoreButton = {};
  const component = { marker: "dialog" };
  const componentDoc = {
    querySelector(selector) {
      return {
        "recent-jobs-dialog": component,
      }[selector] || null;
    },
  };
  assert.equal(resolveRecentJobsHost(componentDoc).kind, "component");
  assert.equal(resolveRecentJobsHost(componentDoc).component, component);
  assert.equal(resolveRecentJobsHost(componentDoc).hasView, true);

  const legacyDoc = {
    querySelector(selector) {
      return {
        "#recent-jobs-list": list,
        "#recent-jobs-empty": empty,
        "#load-more-jobs-btn": loadMoreButton,
      }[selector] || null;
    },
  };
  const legacyHost = resolveRecentJobsHost(legacyDoc);
  assert.equal(legacyHost.kind, "legacy");
  assert.equal(legacyHost.legacyMounted, true);
  assert.equal(legacyHost.elements.root, legacyDoc);

  const missingHost = resolveRecentJobsHost({
    querySelector() {
      return null;
    },
  });
  assert.equal(missingHost.kind, "missing");
  assert.equal(missingHost.hasView, false);
});

test("recent jobs card rendering strategy uses custom card elements for library view", () => {
  const previousDocument = global.document;
  const listeners = new Map();
  const created = [];
  const appended = [];
  const list = {
    replaceChildrenCalled: 0,
    replaceChildren() {
      this.replaceChildrenCalled += 1;
    },
    append(fragment) {
      appended.push(fragment);
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
  };
  global.document = {
    createElement(tag) {
      const element = {
        tag,
        item: null,
      };
      created.push(element);
      return element;
    },
    createDocumentFragment() {
      return {
        children: [],
        append(child) {
          this.children.push(child);
        },
      };
    },
  };
  const selected = [];
  const deleted = [];
  const opened = [];

  try {
    renderRecentJobCardElements(list, [
      { job_id: "job-a" },
      { job_id: "job-b" },
    ], {
      reset: true,
      onSelect: (jobId) => selected.push(jobId),
      onDelete: (jobId) => deleted.push(jobId),
      onReader: (jobId) => opened.push(jobId),
    });

    assert.equal(list.replaceChildrenCalled, 1);
    assert.equal(appended.length, 1);
    assert.deepEqual(appended[0].children.map((child) => child.tag), ["recent-job-card", "recent-job-card"]);
    assert.deepEqual(appended[0].children.map((child) => child.item.job_id), ["job-a", "job-b"]);

    listeners.get("recent-job-select")({ detail: { jobId: "job-a" } });
    listeners.get("recent-job-delete")({ detail: { jobId: "job-b" } });
    listeners.get("recent-job-reader")({ detail: { jobId: "job-c" } });
    assert.deepEqual(selected, ["job-a"]);
    assert.deepEqual(deleted, ["job-b"]);
    assert.deepEqual(opened, ["job-c"]);

    renderRecentJobCardElements(list, [{ job_id: "job-c" }], {
      reset: false,
      onSelect: (jobId) => selected.push(`next:${jobId}`),
    });
    assert.equal(list.replaceChildrenCalled, 1);
    listeners.get("recent-job-select")({ detail: { jobId: "job-c" } });
    assert.deepEqual(selected, ["job-a", "next:job-c"]);
  } finally {
    global.document = previousDocument;
  }
});

test("recent jobs render target selects component card or legacy rendering strategy", () => {
  const elements = {
    list: {},
    empty: {},
    loadMoreButton: {},
  };
  const component = { renderList() {} };
  assert.deepEqual(createRecentJobsRenderTarget({
    component,
    elements,
    libraryMounted: true,
  }), {
    component,
    list: elements.list,
    empty: elements.empty,
    loadMoreButton: elements.loadMoreButton,
    useCardElements: false,
    useComponent: true,
    canRenderList: true,
    canReplaceCard: true,
  });

  assert.deepEqual(createRecentJobsRenderTarget({
    component: null,
    elements,
    libraryMounted: true,
  }), {
    component: null,
    list: elements.list,
    empty: elements.empty,
    loadMoreButton: elements.loadMoreButton,
    useCardElements: true,
    useComponent: false,
    canRenderList: true,
    canReplaceCard: true,
  });

  assert.deepEqual(createRecentJobsRenderTarget({
    component: null,
    elements: { list: elements.list },
    libraryMounted: false,
  }), {
    component: null,
    list: elements.list,
    empty: null,
    loadMoreButton: null,
    useCardElements: false,
    useComponent: false,
    canRenderList: false,
    canReplaceCard: true,
  });
});

test("recent jobs component rendering receives feature list behavior ports", () => {
  const previousDocument = global.document;
  const calls = [];
  const component = {
    renderList(markup, options) {
      calls.push({
        markup,
        hasMore: options.hasMore,
        reset: options.reset,
        bindListEvents: typeof options.bindListEvents,
        hydrateImages: typeof options.hydrateImages,
        onSelect: typeof options.onSelect,
        onDelete: typeof options.onDelete,
        onReader: typeof options.onReader,
      });
    },
  };
  global.document = {
    querySelector(selector) {
      if (selector === RECENT_JOBS_SELECTORS.libraryView) {
        return null;
      }
      if (selector === RECENT_JOBS_TAGS.dialog) {
        return component;
      }
      return null;
    },
  };

  try {
    renderRecentJobsViewList({
      items: [{ job_id: "job-component-port", display_name: "Component Port" }],
      allItems: [{ job_id: "job-component-port" }],
      invocationSummary: null,
      reset: true,
      hasMore: true,
      onSelect() {},
      onDelete() {},
      onReader() {},
    });
  } finally {
    global.document = previousDocument;
  }

  assert.equal(calls.length, 1);
  assert.match(calls[0].markup, /job-component-port/);
  assert.deepEqual(calls[0], {
    markup: calls[0].markup,
    hasMore: true,
    reset: true,
    bindListEvents: "function",
    hydrateImages: "function",
    onSelect: "function",
    onDelete: "function",
    onReader: "function",
  });
});

test("recent jobs event target selects component or legacy event binding", () => {
  const calls = [];
  const loadMoreButton = {};
  const scrollBody = {};
  const component = {
    bindEvents(options) {
      calls.push(options);
    },
  };

  const dialogTarget = createRecentJobsEventTarget({
    component,
    elements: { loadMoreButton, scrollBody },
    libraryMounted: false,
  });
  assert.equal(dialogTarget.scrollBody, scrollBody);
  assert.equal(dialogTarget.loadMoreButton, loadMoreButton);
  assert.equal(dialogTarget.useComponentEvents, true);
  assert.equal(dialogTarget.canBindLoadMore, true);
  assert.equal(dialogTarget.bindComponentEvents({ onLoadMore: "load" }), true);
  assert.deepEqual(calls, [{ onLoadMore: "load" }]);

  const libraryTarget = createRecentJobsEventTarget({
    component,
    elements: { loadMoreButton, scrollBody },
    libraryMounted: true,
  });
  assert.equal(libraryTarget.useComponentEvents, false);
  assert.equal(libraryTarget.canBindLoadMore, true);
  assert.equal(libraryTarget.bindComponentEvents({ onLoadMore: "ignored" }), false);
  assert.deepEqual(calls, [{ onLoadMore: "load" }]);

  const emptyTarget = createRecentJobsEventTarget({
    component: null,
    elements: {},
    libraryMounted: false,
  });
  assert.equal(emptyTarget.canBindLoadMore, false);
});

test("recent jobs view state target selects component or DOM state rendering", () => {
  const calls = [];
  const component = {
    renderLoading() {
      calls.push(["loading"]);
    },
    renderError(message, options) {
      calls.push(["error", message, options]);
    },
  };
  const elements = {
    list: {},
    empty: {},
    loadMoreButton: {},
  };

  const componentTarget = createRecentJobsViewStateTarget({ component, elements });
  assert.equal(componentTarget.canApplyDomState, true);
  assert.equal(componentTarget.canApplyLoadMoreState, true);
  assert.equal(componentTarget.applyComponentState("renderLoading"), true);
  assert.equal(componentTarget.applyComponentState("renderError", "失败", { reset: true }), true);
  assert.equal(componentTarget.applyComponentState("renderEmpty", "empty"), false);
  assert.deepEqual(calls, [
    ["loading"],
    ["error", "失败", { reset: true }],
  ]);

  const domOnlyTarget = createRecentJobsViewStateTarget({
    component: null,
    elements,
  });
  assert.equal(domOnlyTarget.canApplyDomState, true);
  assert.equal(domOnlyTarget.canApplyLoadMoreState, true);
  assert.equal(domOnlyTarget.applyComponentState("renderLoading"), false);

  const missingDomTarget = createRecentJobsViewStateTarget({
    component: null,
    elements: { loadMoreButton: elements.loadMoreButton },
  });
  assert.equal(missingDomTarget.canApplyDomState, false);
  assert.equal(missingDomTarget.canApplyLoadMoreState, true);
});

test("recent jobs host actions own dialog open and auto-load decisions", () => {
  const calls = [];
  const openButton = {
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
  const dialog = {
    showModal() {
      calls.push("show");
    },
    close() {
      calls.push("close");
    },
  };

  assert.equal(setRecentJobsDialogHostOpen({ dialog, openButton, open: true }), true);
  assert.equal(setRecentJobsDialogHostOpen({ dialog, openButton, open: false }), true);
  assert.deepEqual(calls, ["show", "close"]);
  assert.equal(openButton.attributes["aria-expanded"], "false");

  const componentCalls = [];
  const component = {
    setOpen(open) {
      componentCalls.push(open);
    },
    scheduleAutoLoadCheck() {
      componentCalls.push("schedule");
    },
  };
  assert.equal(setRecentJobsDialogHostOpen({ component, openButton, open: true }), true);
  assert.deepEqual(componentCalls, [true]);
  assert.equal(openButton.attributes["aria-expanded"], "true");

  const hiddenClassList = {
    contains(name) {
      return name === "hidden";
    },
  };
  const clickable = { clicked: 0, click() { this.clicked += 1; } };
  const scrollBody = { scrollHeight: 1000, scrollTop: 660, clientHeight: 300 };
  assert.equal(shouldAutoLoadRecentJobs({ scrollBody, loadMoreButton: clickable }), true);
  assert.equal(triggerRecentJobsAutoLoad({ scrollBody, loadMoreButton: clickable }), true);
  assert.equal(clickable.clicked, 1);
  assert.equal(shouldAutoLoadRecentJobs({
    scrollBody,
    loadMoreButton: { classList: hiddenClassList },
  }), false);
  assert.equal(shouldAutoLoadRecentJobs({
    scrollBody,
    loadMoreButton: { disabled: true },
  }), false);

  let scheduled = null;
  assert.equal(scheduleRecentJobsAutoLoadHostCheck({
    elements: { scrollBody, loadMoreButton: clickable },
    requestAnimationFrame(callback) {
      scheduled = callback;
    },
  }), true);
  scheduled();
  assert.equal(clickable.clicked, 2);

  assert.equal(scheduleRecentJobsAutoLoadHostCheck({
    elements: { scrollBody, loadMoreButton: clickable },
    requestAnimationFrame(callback) {
      callback();
    },
    isSuspended: () => true,
  }), true);
  assert.equal(clickable.clicked, 2);

  assert.equal(scheduleRecentJobsAutoLoadHostCheck({ component }), true);
  assert.deepEqual(componentCalls, [true, "schedule"]);
});

test("recent jobs markup rendering strategy resets and appends legacy markup", () => {
  const previousDocument = global.document;
  const listeners = new Map();
  const list = {
    innerHTML: "<article data-old=\"1\"></article>",
    dataset: {},
    querySelectorAll() {
      return [];
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
  };
  const selected = [];
  global.document = {};

  try {
    const resetMarkup = renderRecentJobsMarkupList(list, [
      { job_id: "job-reset", display_name: "Reset Book" },
    ], {
      reset: true,
      onSelect: (jobId) => selected.push(jobId),
    });
    assert.match(resetMarkup, /data-job-id="job-reset"/);
    assert.match(list.innerHTML, /data-job-id="job-reset"/);
    assert.doesNotMatch(list.innerHTML, /data-old/);

    const appendMarkup = renderRecentJobsMarkupList(list, [
      { job_id: "job-append", display_name: "Append Book" },
    ], {
      reset: false,
      onSelect: (jobId) => selected.push(`next:${jobId}`),
    });
    assert.match(appendMarkup, /data-job-id="job-append"/);
    assert.match(list.innerHTML, /data-job-id="job-reset"/);
    assert.match(list.innerHTML, /data-job-id="job-append"/);

    list[RECENT_JOBS_PRIVATE_KEYS.select]?.("job-append");
    assert.deepEqual(selected, ["next:job-append"]);
    assert.equal(typeof listeners.get("click"), "function");
    assert.equal(typeof listeners.get("keydown"), "function");
  } finally {
    global.document = previousDocument;
  }
});

test("recent jobs view state helper owns list empty error and load-more states", () => {
  function element() {
    const classes = new Set();
    return {
      innerHTML: "old",
      textContent: "",
      disabled: true,
      classList: {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        toggle(name, force) {
          if (force) {
            classes.add(name);
          } else {
            classes.delete(name);
          }
        },
        contains(name) {
          return classes.has(name);
        },
      },
    };
  }

  const list = element();
  const empty = element();
  const loadMoreButton = element();

  assert.equal(applyRecentJobsLoadingState({ list, empty, loadMoreButton }), true);
  assert.equal(empty.classList.contains("hidden"), true);
  assert.equal(list.classList.contains("hidden"), false);
  assert.match(list.innerHTML, /正在加载最近任务…/);
  assert.equal(loadMoreButton.classList.contains("hidden"), true);

  assert.equal(applyRecentJobsEmptyState({ list, empty, loadMoreButton }, ""), true);
  assert.equal(list.innerHTML, "");
  assert.equal(list.classList.contains("hidden"), true);
  assert.equal(empty.classList.contains("hidden"), false);
  assert.equal(empty.textContent, RECENT_JOBS_VIEW_TEXT.empty);
  assert.equal(loadMoreButton.disabled, false);
  assert.equal(loadMoreButton.textContent, "更多");

  assert.equal(applyRecentJobsErrorState({ list, empty, loadMoreButton }, "boom", { reset: true }), true);
  assert.equal(list.classList.contains("hidden"), true);
  assert.equal(empty.textContent, "boom");
  assert.equal(empty.classList.contains("hidden"), false);

  assert.equal(applyRecentJobsListState({ list, empty, loadMoreButton }, { hasMore: true }), true);
  assert.equal(list.classList.contains("hidden"), false);
  assert.equal(empty.classList.contains("hidden"), true);
  assert.equal(loadMoreButton.classList.contains("hidden"), false);
  assert.equal(loadMoreButton.disabled, false);
  assert.equal(loadMoreButton.textContent, "更多");

  assert.equal(applyRecentJobsLoadMoreLoadingState({ loadMoreButton }), true);
  assert.equal(loadMoreButton.disabled, true);
  assert.equal(loadMoreButton.textContent, RECENT_JOBS_VIEW_TEXT.loadMoreLoadingMain);

  assert.equal(applyRecentJobsListState({ list: null, empty, loadMoreButton }), false);
});

test("recent jobs summary view model owns invocation counts and display text", () => {
  const items = [
    { invocation: { input_protocol: "stage_spec" } },
    { invocation: { input_protocol: "unknown" } },
    { invocation: { input_protocol: "" } },
    {},
  ];

  assert.deepEqual(summarizeRecentJobsInvocationCounts(items), {
    stageSpecCount: 1,
    unknownCount: 3,
  });
  assert.deepEqual(
    buildRecentJobsSummaryViewModel({ stage_spec_count: 7, unknown_count: 2 }, items),
    {
      stageSpecCount: 7,
      unknownCount: 2,
      text: "Stage Spec 7 · Unknown 2",
    },
  );
  assert.deepEqual(
    buildRecentJobsSummaryViewModel({ stage_spec_count: 7, unknown_count: "bad" }, items),
    {
      stageSpecCount: 1,
      unknownCount: 3,
      text: "Stage Spec 1 · Unknown 3",
    },
  );
});

test("home state port updates state and dispatches app events", () => {
  const previousDocument = global.document;
  const previousCustomEvent = global.CustomEvent;
  const events = [];
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  global.document = {
    dispatchEvent(event) {
      events.push(event);
    },
  };

  try {
    const localState = createInitialState();
    const port = createHomeStatePort(localState);
    port.setViewMode("bad-mode");
    assert.equal(port.getSnapshot().viewMode, "library");
    // 迁移完成:store 是唯一真值,旧 state 对象不再被回写
    assert.equal(localState.homeViewMode, "library");
    assert.equal(events.at(-1).type, APP_EVENTS.homeViewModeChanged);
    assert.deepEqual(events.at(-1).detail, { mode: "library" });

    port.setRecentJobsLoadingState("error", "boom");
    assert.equal(port.getSnapshot().recentJobsLoadingState, "error");
    assert.equal(port.getSnapshot().recentJobsError, "boom");
    assert.equal(events.at(-1).type, APP_EVENTS.homeRecentJobsStateChanged);
    assert.deepEqual(events.at(-1).detail, {
      loadingState: "error",
      error: "boom",
    });
    assert.deepEqual(port.getSnapshot(), {
      viewMode: "library",
      recentJobsLoadingState: "error",
      recentJobsError: "boom",
    });
  } finally {
    global.document = previousDocument;
    global.CustomEvent = previousCustomEvent;
  }
});

test("home state port normalizes initial state and tolerates missing event APIs", () => {
  const localState = {
    homeViewMode: "bad-mode",
    homeRecentJobsLoadingState: "bad-loading",
    homeRecentJobsError: 123,
  };
  const port = createHomeStatePort(localState, {
    eventTarget: {},
  });

  assert.deepEqual(port.getSnapshot(), {
    viewMode: "library",
    recentJobsLoadingState: "idle",
    recentJobsError: "123",
  });
  // 不再回写旧对象:初始值保持调用方传入的原样
  assert.equal(localState.homeViewMode, "bad-mode");
  assert.equal(localState.homeRecentJobsLoadingState, "bad-loading");
  assert.equal(localState.homeRecentJobsError, 123);

  port.setViewMode("workflow_status");
  port.setRecentJobsLoadingState("bad-loading", "boom");

  assert.deepEqual(port.getSnapshot(), {
    viewMode: "workflow_status",
    recentJobsLoadingState: "idle",
    recentJobsError: "boom",
  });
});

test("home state port can dispatch through an injected event target", () => {
  const previousCustomEvent = global.CustomEvent;
  const events = [];
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };

  try {
    const port = createHomeStatePort({}, {
      eventTarget: {
        dispatchEvent(event) {
          events.push(event);
        },
      },
    });

    port.setViewMode("workflow_upload");
    port.setRecentJobsLoadingState("ready");

    assert.deepEqual(events.map((event) => [event.type, event.detail]), [
      [APP_EVENTS.homeViewModeChanged, { mode: "workflow_upload" }],
      [APP_EVENTS.homeRecentJobsStateChanged, {
        loadingState: "ready",
        error: "",
      }],
    ]);
  } finally {
    global.CustomEvent = previousCustomEvent;
  }
});

test("home feature routes initial view mode through view port", () => {
  const calls = [];
  const feature = mountHomeFeature({
    statePort: {
      getSnapshot: () => ({ viewMode: "workflow_upload" }),
      setViewMode: (mode) => calls.push(["setViewMode", mode]),
    },
    viewPort: createHomeViewPort({
      bindStateView: () => calls.push(["bind"]),
      applyViewMode: (mode) => calls.push(["apply", mode]),
    }),
  });

  feature.bindEvents();
  feature.setViewMode("library");

  assert.deepEqual(calls, [
    ["bind"],
    ["apply", "workflow_upload"],
    ["setViewMode", "library"],
  ]);
});

test("home store owns home state without the legacy global state object", () => {
  const store = createHomeStore({
    homeViewMode: "workflow_upload",
    homeRecentJobsLoadingState: "loading",
  });
  assert.deepEqual(store.getSnapshot(), {
    viewMode: "workflow_upload",
    recentJobsLoadingState: "loading",
    recentJobsError: "",
  });

  store.actions.setViewMode("bad-mode");
  store.actions.setRecentJobsLoadingState("error", "boom");

  assert.deepEqual(store.getSnapshot(), {
    viewMode: "library",
    recentJobsLoadingState: "error",
    recentJobsError: "boom",
  });
});

test("translation workflow dialog state port owns open mode and home view sync", () => {
  const modes = [];
  const port = createTranslationWorkflowDialogStatePort({
    homeStatePort: {
      setViewMode(mode) {
        modes.push(mode);
      },
    },
  });

  assert.deepEqual(port.getSnapshot(), {
    open: false,
    mode: TRANSLATION_WORKFLOW_MODES.UPLOAD,
  });
  assert.equal(
    homeViewModeForTranslationWorkflow(TRANSLATION_WORKFLOW_MODES.STATUS, false),
    "library",
  );

  port.open(TRANSLATION_WORKFLOW_MODES.STATUS);
  assert.deepEqual(port.getSnapshot(), {
    open: true,
    mode: TRANSLATION_WORKFLOW_MODES.STATUS,
  });
  port.setMode(TRANSLATION_WORKFLOW_MODES.UPLOAD);
  port.close();

  assert.deepEqual(modes, ["workflow_status", "workflow_upload", "library"]);
});

test("translation workflow dialog view updates injected home state port", () => {
  const previousDocument = global.document;
  const previousCustomEvent = global.CustomEvent;
  const previousHTMLElement = global.HTMLElement;
  const previousWindow = global.window;
  const elements = new Map();
  const modes = [];

  function createElement(id = "") {
    const classes = new Set();
    return {
      id,
      dataset: {},
      textContent: "",
      classList: {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        toggle(name, force) {
          if (force) {
            classes.add(name);
          } else {
            classes.delete(name);
          }
        },
        contains: (name) => classes.has(name),
      },
    };
  }

  const dialog = createElement(TRANSLATION_WORKFLOW_DIALOG.ids.dialog);
  const title = createElement(TRANSLATION_WORKFLOW_DIALOG.ids.title);
  const addPdfButton = {
    dataset: {},
    attributes: {},
    classList: createElement("add-pdf-button").classList,
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
  const statusSection = createElement("status-section");
  statusSection.classList.add("hidden");
  elements.set(TRANSLATION_WORKFLOW_DIALOG.ids.dialog, dialog);
  elements.set(TRANSLATION_WORKFLOW_DIALOG.ids.title, title);
  elements.set(APP_SHELL_IDS.libraryAddPdfButton, addPdfButton);
  elements.set("status-section", statusSection);

  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  global.HTMLElement = class HTMLElement {};
  global.window = {};
  global.document = {
    documentElement: createElement("html"),
    getElementById: (id) => elements.get(id) || null,
    dispatchEvent() {},
  };

  try {
    const homeStatePort = {
      setViewMode(mode) {
        modes.push(mode);
      },
    };
    const dialogStatePort = createTranslationWorkflowDialogStatePort({ homeStatePort });

    openTranslationWorkflowDialogView({ dialogStatePort });
    assert.equal(
      dialog.dataset[TRANSLATION_WORKFLOW_DIALOG.datasets.open],
      TRANSLATION_WORKFLOW_DIALOG.datasetValues.open,
    );
    assert.equal(dialog.classList.contains(TRANSLATION_WORKFLOW_DIALOG.classes.hidden), false);
    assert.equal(title.textContent, TRANSLATION_WORKFLOW_DIALOG.copy.uploadTitle);
    assert.equal(addPdfButton.attributes["aria-expanded"], "true");
    assert.equal(addPdfButton.dataset.workflowOpen, "1");
    assert.equal(addPdfButton.dataset.workflowMode, TRANSLATION_WORKFLOW_MODES.UPLOAD);
    assert.equal(addPdfButton.classList.contains("is-active"), true);
    assert.deepEqual(modes, ["workflow_upload"]);

    openTranslationWorkflowDialogView({
      dialogStatePort,
      mode: TRANSLATION_WORKFLOW_MODES.UPLOAD,
      statusAreaPort: { isVisible: () => true },
    });
    assert.equal(title.textContent, TRANSLATION_WORKFLOW_DIALOG.copy.uploadTitle);
    assert.equal(addPdfButton.dataset.workflowMode, TRANSLATION_WORKFLOW_MODES.UPLOAD);

    closeTranslationWorkflowDialogView({ dialogStatePort });
    assert.equal(
      dialog.dataset[TRANSLATION_WORKFLOW_DIALOG.datasets.open],
      TRANSLATION_WORKFLOW_DIALOG.datasetValues.closed,
    );
    assert.equal(dialog.classList.contains(TRANSLATION_WORKFLOW_DIALOG.classes.hidden), true);
    assert.equal(addPdfButton.attributes["aria-expanded"], "false");
    assert.equal(addPdfButton.dataset.workflowOpen, "0");
    assert.equal(addPdfButton.classList.contains("is-active"), false);
    assert.deepEqual(modes, ["workflow_upload", "workflow_upload", "library"]);
  } finally {
    global.document = previousDocument;
    global.CustomEvent = previousCustomEvent;
    global.HTMLElement = previousHTMLElement;
    global.window = previousWindow;
  }
});

test("translation workflow dialog controller routes dialog operations through view port", () => {
  const previousDocument = global.document;
  const calls = [];
  const documentListeners = new Map();
  const addPdfTrigger = {
    closest(selector) {
      return selector === `#${APP_SHELL_IDS.libraryAddPdfButton}` ? this : null;
    },
  };
  const dialogElement = {
    addEventListener(type, handler) {
      calls.push(["dialogBind", type]);
      this[type] = handler;
    },
  };
  const closeButton = {
    addEventListener(type, handler) {
      calls.push(["closeBind", type]);
      this[type] = handler;
    },
  };

  global.document = {
    addEventListener(type, handler) {
      calls.push(["documentBind", type]);
      documentListeners.set(type, handler);
    },
    getElementById() {
      return {
        classList: {
          contains(name) {
            return name === "hidden";
          },
        },
      };
    },
    querySelector() {
      return null;
    },
  };

  try {
    const feature = mountTranslationWorkflowDialogFeature({
      dialogStatePort: {
        open: () => ({ open: true }),
        close: () => ({ open: false }),
        setMode: () => ({ open: true }),
      },
      statusAreaPort: {
        isVisible: () => false,
        returnHome: () => calls.push(["returnHome"]),
      },
      uploadSessionPort: {
        resetUploadSession: () => calls.push(["reset-upload"]),
      },
      viewPort: createTranslationWorkflowDialogViewPort({
        closeButtonElement: () => closeButton,
        closeDialog: () => calls.push(["close"]),
        dialogElement: () => dialogElement,
        isOpen: () => true,
        openDialog: () => calls.push(["open"]),
        syncMode: () => calls.push(["sync"]),
      }),
    });

    feature.bindEvents();
    documentListeners.get("click")({
      target: addPdfTrigger,
      preventDefault: () => calls.push(["preventDefault"]),
      stopPropagation: () => calls.push(["stopPropagation"]),
    });
    documentListeners.get(APP_EVENTS.openTranslationWorkflow)();
    documentListeners.get(APP_EVENTS.translationWorkflowSync)();
    documentListeners.get("keydown")({ key: "Escape" });
    closeButton.click();

    assert.deepEqual(calls, [
      ["documentBind", "click"],
      ["documentBind", APP_EVENTS.openTranslationWorkflow],
      ["documentBind", APP_EVENTS.closeTranslationWorkflow],
      ["documentBind", APP_EVENTS.translationWorkflowSync],
      ["documentBind", APP_EVENTS.statusAreaVisibilityChanged],
      ["dialogBind", "click"],
      ["documentBind", "keydown"],
      ["closeBind", "click"],
      ["preventDefault"],
      ["stopPropagation"],
      ["reset-upload"],
      ["open"],
      ["reset-upload"],
      ["open"],
      ["sync"],
      ["close"],
      ["close"],
    ]);
  } finally {
    global.document = previousDocument;
  }
});

test("translation workflow dialog routes close through status area port when status is visible", () => {
  const previousDocument = global.document;
  const calls = [];
  const documentListeners = new Map();
  global.document = {
    addEventListener(type, handler) {
      documentListeners.set(type, handler);
    },
  };
  try {
    const feature = mountTranslationWorkflowDialogFeature({
      dialogStatePort: {
        open: () => ({ open: true }),
        close: () => ({ open: false }),
        setMode: () => ({ open: true }),
      },
      statusAreaPort: {
        isVisible: () => true,
        hide: () => calls.push(["hide"]),
        returnHome: () => calls.push(["returnHome"]),
      },
      uploadSessionPort: {
        resetUploadSession: () => calls.push(["reset-upload"]),
      },
      viewPort: createTranslationWorkflowDialogViewPort({
        closeButtonElement: () => null,
        closeDialog: () => calls.push(["close"]),
        dialogElement: () => null,
        isOpen: () => true,
        openDialog: () => calls.push(["open"]),
        syncMode: () => calls.push(["sync"]),
      }),
    });

    feature.bindEvents();
    documentListeners.get("keydown")({ key: "Escape" });

    assert.deepEqual(calls, [["returnHome"]]);
  } finally {
    global.document = previousDocument;
  }
});

test("translation workflow add PDF trigger opens upload mode even when status area is visible", () => {
  const previousDocument = global.document;
  const calls = [];
  const documentListeners = new Map();
  const addPdfTrigger = {
    closest(selector) {
      return selector === `#${APP_SHELL_IDS.libraryAddPdfButton}` ? this : null;
    },
  };

  global.document = {
    addEventListener(type, handler) {
      documentListeners.set(type, handler);
    },
  };
  try {
    const feature = mountTranslationWorkflowDialogFeature({
      dialogStatePort: {
        open: () => ({ open: true }),
        close: () => ({ open: false }),
        setMode: () => ({ open: true }),
      },
      statusAreaPort: {
        isVisible: () => true,
        hide: () => calls.push(["hide"]),
        returnHome: () => calls.push(["returnHome"]),
      },
      uploadSessionPort: {
        resetUploadSession: () => calls.push(["reset-upload"]),
      },
      viewPort: createTranslationWorkflowDialogViewPort({
        closeButtonElement: () => null,
        closeDialog: () => calls.push(["close"]),
        dialogElement: () => null,
        isOpen: () => false,
        openDialog: (options = {}) => calls.push(["open", options.mode]),
        syncMode: () => calls.push(["sync"]),
      }),
    });

    feature.bindEvents();
    documentListeners.get("click")({
      target: addPdfTrigger,
      preventDefault: () => calls.push(["preventDefault"]),
      stopPropagation: () => calls.push(["stopPropagation"]),
    });

    assert.deepEqual(calls, [
      ["preventDefault"],
      ["stopPropagation"],
      ["hide"],
      ["reset-upload"],
      ["open", TRANSLATION_WORKFLOW_MODES.UPLOAD],
    ]);
  } finally {
    global.document = previousDocument;
  }
});

test("translation workflow status event opens without resetting upload session", () => {
  const previousDocument = global.document;
  const calls = [];
  const documentListeners = new Map();
  global.document = {
    addEventListener(type, handler) {
      documentListeners.set(type, handler);
    },
  };
  try {
    const feature = mountTranslationWorkflowDialogFeature({
      dialogStatePort: {
        open: () => ({ open: true }),
        close: () => ({ open: false }),
        setMode: () => ({ open: true }),
      },
      statusAreaPort: {
        isVisible: () => false,
        hide: () => calls.push(["hide"]),
        returnHome: () => calls.push(["returnHome"]),
      },
      uploadSessionPort: {
        resetUploadSession: () => calls.push(["reset-upload"]),
      },
      viewPort: createTranslationWorkflowDialogViewPort({
        closeButtonElement: () => null,
        closeDialog: () => calls.push(["close"]),
        dialogElement: () => null,
        isOpen: () => false,
        openDialog: (options = {}) => calls.push(["open", options.mode]),
        syncMode: () => calls.push(["sync"]),
      }),
    });

    feature.bindEvents();
    documentListeners.get(APP_EVENTS.openTranslationWorkflow)({
      detail: { mode: TRANSLATION_WORKFLOW_MODES.STATUS },
    });

    assert.deepEqual(calls, [
      ["open", TRANSLATION_WORKFLOW_MODES.STATUS],
    ]);
  } finally {
    global.document = previousDocument;
  }
});

test("recent jobs state port normalizes pagination state", () => {
  const localState = createInitialState();
  const port = createRecentJobsStatePort(localState);

  port.setOffset("12");
  port.setHasMore("");
  port.setItems([{ job_id: "job-1" }]);
  assert.deepEqual(port.getSnapshot(), {
    offset: 12,
    hasMore: false,
    invocationSummary: null,
    items: [{ job_id: "job-1" }],
  });

  port.setItems("not-array");
  assert.deepEqual(port.getSnapshot().items, []);

  port.prependItem({ job_id: "job-new" });
  port.prependItem({ job_id: "job-new", title: "duplicate ignored" });
  port.replaceItem({ job_id: "job-new", title: "updated" });
  port.prependItem({ job_id: "job-other-ocr" });
  assert.deepEqual(port.getSnapshot().items, [
    { job_id: "job-other-ocr" },
    { job_id: "job-new", title: "updated" },
  ]);
  port.removeJobFamily("job-other");
  assert.deepEqual(port.getSnapshot().items, [
    { job_id: "job-new", title: "updated" },
  ]);

  port.resetPagination();
  assert.deepEqual(port.getSnapshot(), {
    offset: 0,
    hasMore: true,
    invocationSummary: null,
    items: [],
  });
});

test("recent jobs state port exposes store subscriptions for card refresh", () => {
  const localState = createInitialState();
  const port = createRecentJobsStatePort(localState);
  const notifications = [];
  const unsubscribe = port.subscribe((snapshot, meta) => {
    notifications.push([meta.action, snapshot.items.map((item) => item.job_id)]);
  });

  port.prependItem({ job_id: "job-live" });
  port.replaceItem({ job_id: "job-live", status: "running" });
  unsubscribe();
  port.replaceItem({ job_id: "job-live", status: "succeeded" });

  assert.deepEqual(notifications, [
    ["prependItem", ["job-live"]],
    ["replaceItem", ["job-live"]],
  ]);
});

test("recent jobs store renderer refreshes visible cards from store mutations", () => {
  const port = createRecentJobsStatePort({
    recentJobsItems: [],
    recentJobsHasMore: true,
  });
  const renders = [];
  const renderer = createRecentJobsStoreRenderer({
    recentJobsStatePort: port,
    renderRecentJobsList: (payload) => {
      renders.push({
        items: payload.items.map((item) => item.job_id),
        invocationSummary: payload.invocationSummary,
        hasMore: payload.hasMore,
        reset: payload.reset,
      });
    },
    actions: {
      selectJob() {},
      deleteJob() {},
      openJobReader() {},
    },
  });

  port.prependItem({ job_id: "job-created" });
  port.replaceItem({ job_id: "job-created", status: "running" });
  port.setHasMore(false);
  renderer.unmount();
  port.replaceItem({ job_id: "job-created", status: "succeeded" });

  assert.deepEqual(renders, [
    { items: ["job-created"], invocationSummary: null, hasMore: true, reset: true },
    { items: ["job-created"], invocationSummary: null, hasMore: true, reset: true },
  ]);
});

test("recent jobs store renderer can opt into page-level store rendering", () => {
  const port = createRecentJobsStatePort({
    recentJobsItems: [],
    recentJobsHasMore: true,
  });
  const renders = [];
  const renderer = createRecentJobsStoreRenderer({
    recentJobsStatePort: port,
    renderActions: ["setItems", "setHasMore"],
    renderRecentJobsList: (payload) => {
      renders.push({
        items: payload.items.map((item) => item.job_id),
        invocationSummary: payload.invocationSummary,
        hasMore: payload.hasMore,
        reset: payload.reset,
      });
    },
  });

  port.setItems([{ job_id: "job-page" }]);
  port.setHasMore(false);
  port.replaceItem({ job_id: "job-page", status: "running" });
  renderer.unmount();

  assert.deepEqual(renders, [
    { items: ["job-page"], invocationSummary: null, hasMore: true, reset: true },
    { items: ["job-page"], invocationSummary: null, hasMore: false, reset: true },
  ]);
});

test("recent jobs state port is backed by the app-framework store without legacy mirror", () => {
  const localState = createInitialState();
  const port = createRecentJobsStatePort(localState);

  assert.equal(port.store.name, "recentJobs");

  port.setItems([{ job_id: "job-store" }]);
  port.setInvocationSummary({ stage_spec_count: 7, unknown_count: 2 });
  port.setOffset(20);
  port.setHasMore(true);

  assert.deepEqual(port.store.getSnapshot(), {
    offset: 20,
    hasMore: true,
    invocationSummary: { stage_spec_count: 7, unknown_count: 2 },
    items: [{ job_id: "job-store" }],
  });
  // 迁移完成:store 是唯一真值,旧 state 对象不再被回写
  assert.equal(localState.recentJobsOffset, 0);
  assert.equal(localState.recentJobsHasMore, true);
  assert.deepEqual(localState.recentJobsItems, []);
});

test("recent jobs state port batches pagination updates into one notification", () => {
  const localState = createInitialState();
  const port = createRecentJobsStatePort(localState);
  const events = [];
  port.store.subscribe((snapshot, meta) => {
    events.push({ snapshot, meta });
  });

  port.batch(({ setOffset, setHasMore, setInvocationSummary, setItems }) => {
    setOffset(10);
    setHasMore(false);
    setInvocationSummary({ stage_spec_count: 1 });
    setItems([{ job_id: "job-batch" }]);
  });

  assert.deepEqual(port.getSnapshot(), {
    offset: 10,
    hasMore: false,
    invocationSummary: { stage_spec_count: 1 },
    items: [{ job_id: "job-batch" }],
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].meta.action, "setOffset");
});

test("recent jobs store can be used without the legacy global state object", () => {
  const store = createRecentJobsStore({
    offset: 3,
    hasMore: false,
    items: [{ job_id: "job-initial" }],
  });
  const actions = [];
  store.subscribe((snapshot, meta) => actions.push([meta.action, snapshot.offset]));

  store.actions.setOffset("7");
  store.actions.resetPagination();

  assert.deepEqual(store.getSnapshot(), {
    offset: 0,
    hasMore: true,
    invocationSummary: null,
    items: [],
  });
  assert.deepEqual(actions, [
    ["setOffset", 7],
    ["resetPagination", 0],
  ]);
});

test("recent jobs library refresh port normalizes app events", () => {
  const listeners = new Map();
  const calls = [];
  const target = {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) {
        listeners.delete(type);
      }
    },
  };
  const port = createRecentJobsLibraryRefreshPort({ target });
  const subscription = port.subscribe({
    onRefreshRequested: (detail) => calls.push(["refresh", detail]),
    onJobUpdated: (detail) => calls.push(["updated", detail]),
    onJobCreated: (detail) => calls.push(["created", detail]),
  });

  listeners.get(APP_EVENTS.libraryRefreshRequested)?.({ detail: { delay: "250", force: true } });
  listeners.get(APP_EVENTS.libraryJobUpdated)?.({ detail: { job: { job_id: "job-updated" } } });
  listeners.get(APP_EVENTS.libraryJobCreated)?.({ detail: { job: { job_id: "job-created" } } });

  assert.deepEqual(calls, [
    ["refresh", { delay: 250, force: true }],
    ["updated", { job: { job_id: "job-updated" } }],
    ["created", { job: { job_id: "job-created" } }],
  ]);

  subscription.destroy();
  assert.equal(listeners.size, 0);
});

test("recent jobs command port translates library mutations into app commands", async () => {
  const calls = [];
  const commandHandlers = new Map();
  const commands = {
    on(command, handler) {
      commandHandlers.set(command, handler);
      return () => commandHandlers.delete(command);
    },
    async dispatch(command, payload) {
      calls.push([command, payload]);
      return [await commandHandlers.get(command)?.(payload)];
    },
  };
  const port = createRecentJobsCommandPort({ commands });
  const received = [];
  const subscription = port.subscribe({
    onRefreshRequested: (payload) => received.push(["refresh", payload]),
    onJobUpdated: (payload) => received.push(["updated", payload]),
    onJobCreated: (payload) => received.push(["created", payload]),
  });

  await port.requestRefresh({ delay: "120", force: true });
  await port.publishJobUpdated({ job_id: "job-updated" });
  await port.publishJobCreated({ job_id: "job-created" });

  assert.deepEqual(calls, [
    [RECENT_JOBS_COMMANDS.refreshRequested, { delay: 120, force: true }],
    [RECENT_JOBS_COMMANDS.jobUpdated, { job: { job_id: "job-updated" } }],
    [RECENT_JOBS_COMMANDS.jobCreated, { job: { job_id: "job-created" } }],
  ]);
  assert.deepEqual(received, [
    ["refresh", { delay: 120, force: true }],
    ["updated", { job: { job_id: "job-updated" } }],
    ["created", { job: { job_id: "job-created" } }],
  ]);

  subscription.destroy();
  assert.equal(commandHandlers.size, 0);
});

test("library books resource owns recent jobs page loading and cache keys", async () => {
  const calls = [];
  const resource = createLibraryBooksResource({
    apiPrefix: "/api/v1",
    fetchLibraryBookList: async (apiPrefix, params) => {
      calls.push([apiPrefix, params]);
      return {
        invocation_summary: { total: 3 },
        items: [
          { job_id: "job-existing" },
          { job_id: "job-2" },
          { job_id: "job-3" },
        ],
      };
    },
  });

  const first = await resource.load({
    startOffset: 4,
    pageSize: 2,
    query: "density",
    existingJobIds: new Set(["job-existing"]),
  });
  const second = await resource.load({
    startOffset: 4,
    pageSize: 2,
    query: "density",
    existingJobIds: ["job-existing"],
  });

  assert.equal(first.status, "success");
  assert.deepEqual(first.data.collected.map((item) => item.job_id), ["job-2", "job-3"]);
  assert.deepEqual(first.data.latestInvocationSummary, { total: 3 });
  assert.equal(first.data.nextOffset, 24);
  assert.equal(calls.length, 1);
  assert.equal(second.status, "success");
  assert.deepEqual(second.data.collected.map((item) => item.job_id), ["job-2", "job-3"]);
});

test("recent jobs pagination renders short first library page without waiting for a full page", async () => {
  const calls = [];
  const result = await collectRecentJobsPage({
    apiPrefix: "/api/v1",
    startOffset: 0,
    pageSize: 24,
    fetchLibraryBookList: async (apiPrefix, params) => {
      calls.push([apiPrefix, params]);
      return {
        items: [
          { job_id: "job-short-1", workflow: "book" },
          { job_id: "job-short-2", workflow: "book" },
          { job_id: "job-short-3", workflow: "book" },
        ],
      };
    },
  });

  assert.deepEqual(result.collected.map((item) => item.job_id), [
    "job-short-1",
    "job-short-2",
    "job-short-3",
  ]);
  assert.equal(result.hasMore, false);
  assert.equal(result.nextOffset, 24);
  assert.equal(calls.length, 1);
});

test("recent jobs pagination prefers the documented jobs list over legacy library books", async () => {
  const calls = [];
  const result = await collectRecentJobsPage({
    apiPrefix: "/api/v1",
    startOffset: 0,
    pageSize: 24,
    fetchJobList: async (apiPrefix, params) => {
      calls.push(["jobs", apiPrefix, params]);
      return {
        items: [
          { job_id: "job-list-1", workflow: "book" },
          { job_id: "job-list-1-ocr", workflow: "ocr" },
          { job_id: "job-list-2", workflow: "book" },
        ],
        has_more: false,
      };
    },
    fetchLibraryBookList: async () => {
      calls.push(["library"]);
      return { items: [{ job_id: "legacy-library-book" }] };
    },
  });

  assert.deepEqual(result.collected.map((item) => item.job_id), ["job-list-1", "job-list-2"]);
  assert.equal(result.hasMore, false);
  assert.deepEqual(calls, [
    ["jobs", "/api/v1", { limit: 24, offset: 0, q: "" }],
  ]);
});

test("library books resource falls back to jobs list when library API is unavailable", async () => {
  const calls = [];
  const resource = createLibraryBooksResource({
    apiPrefix: "/api/v1",
    fetchJobList: async (apiPrefix, params) => {
      calls.push([apiPrefix, params]);
      return {
        items: [{ job_id: "job-fallback", workflow: "book" }],
      };
    },
  });

  const snapshot = await resource.load({
    startOffset: 0,
    pageSize: 1,
    query: "",
  });

  assert.equal(snapshot.status, "success");
  assert.deepEqual(snapshot.data.collected.map((item) => item.job_id), ["job-fallback"]);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ["/api/v1", { limit: 20, offset: 0, q: "" }]);
});

test("library books resource invalidation clears cached list pages", async () => {
  let version = 0;
  const resource = createLibraryBooksResource({
    apiPrefix: "/api/v1",
    fetchLibraryBookList: async () => {
      version += 1;
      return {
        items: [{ job_id: `job-${version}` }],
      };
    },
  });

  const first = await resource.load({ startOffset: 0, pageSize: 1 });
  const cached = await resource.load({ startOffset: 0, pageSize: 1 });
  invalidateLibraryBooksResource(resource);
  const refreshed = await resource.load({ startOffset: 0, pageSize: 1 });

  assert.deepEqual(first.data.collected.map((item) => item.job_id), ["job-1"]);
  assert.deepEqual(cached.data.collected.map((item) => item.job_id), ["job-1"]);
  assert.deepEqual(refreshed.data.collected.map((item) => item.job_id), ["job-2"]);
});

test("library books resource invalidation helper tolerates missing resources", () => {
  assert.doesNotThrow(() => invalidateLibraryBooksResource(null));
  assert.doesNotThrow(() => invalidateLibraryBooksResource({}));
});

test("recent jobs page commit refreshes active cards without auto-opening jobs", () => {
  const previousDocument = global.document;
  const nodes = new Map();
  const rendered = [];
  const recovered = [];
  const refreshCalls = [];
  const autoLoads = [];
  const list = {
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
    addEventListener() {},
    append(fragment) {
      rendered.push(
        ...Array.from(fragment.children || []).map((node) => node.item?.job_id),
      );
    },
    querySelectorAll() { return []; },
    replaceChildren() {
      rendered.length = 0;
    },
  };
  const empty = { classList: { add() {}, remove() {}, toggle() {} }, textContent: "" };
  const loadMoreButton = {
    disabled: false,
    textContent: "",
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; },
    },
  };
  const libraryView = {
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
  };
  nodes.set("#library-view", libraryView);
  nodes.set("#library-view #recent-jobs-list", list);
  nodes.set("#recent-jobs-list", list);
  nodes.set("#recent-jobs-empty", empty);
  nodes.set("#load-more-jobs-btn", loadMoreButton);
  global.document = {
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
    createElement(tagName) {
      if (tagName === RECENT_JOBS_TAGS.card) {
        return { tagName, item: null };
      }
      return { tagName };
    },
    createDocumentFragment() {
      return {
        children: [],
        append(node) {
          this.children.push(node);
        },
      };
    },
  };

  const statePort = createRecentJobsStatePort({
    recentJobsOffset: 0,
    recentJobsHasMore: true,
    recentJobsItems: [],
  });
  const runtimePatches = createRecentJobsRuntimePatches({
    statePort,
    replaceRecentJobCard: () => false,
    renderCurrentRecentJobs() {},
    scheduleActiveRefresh() {},
  });

  try {
    const result = commitRecentJobsPage({
      reset: true,
      collected: [{ job_id: "job-running", status: "running" }],
      hasMore: true,
      nextOffset: 24,
      recentJobActions: {
        recoverActiveJob: (items) => recovered.push(items.map((item) => item.job_id)),
        selectJob() {},
        deleteJob() {},
        openJobReader() {},
      },
      runtimePatches,
      activeRefreshLoop: () => ({
        schedule: () => refreshCalls.push("schedule"),
        stop: () => refreshCalls.push("stop"),
      }),
      scheduleAutoLoadIfNeeded: () => autoLoads.push("auto"),
      recentJobsStatePort: statePort,
      setTimeoutFn(callback) {
        callback();
        return 1;
      },
    });

    assert.deepEqual(result.nextItems.map((item) => item.job_id), ["job-running"]);
    assert.deepEqual(rendered, ["job-running"]);
    assert.deepEqual(recovered, []);
    assert.deepEqual(refreshCalls, ["schedule"]);
    assert.deepEqual(autoLoads, ["auto"]);
    assert.equal(statePort.getSnapshot().offset, 24);
  } finally {
    global.document = previousDocument;
  }
});

test("recent jobs page commit can delegate page rendering to the store renderer", () => {
  const statePort = createRecentJobsStatePort({
    recentJobsOffset: 0,
    recentJobsHasMore: true,
    recentJobsItems: [],
  });
  const storeRenders = [];
  const renderer = createRecentJobsStoreRenderer({
    recentJobsStatePort: statePort,
    renderActions: ["setOffset"],
    renderRecentJobsList: (payload) => {
      storeRenders.push({
        items: payload.items.map((item) => item.job_id),
        invocationSummary: payload.invocationSummary,
        hasMore: payload.hasMore,
      });
    },
  });
  const runtimePatches = createRecentJobsRuntimePatches({
    statePort,
    replaceRecentJobCard: () => false,
    renderCurrentRecentJobs() {
      throw new Error("commit should not use runtime rerender in store-driven mode");
    },
    scheduleActiveRefresh() {},
    storeDrivenRendering: true,
  });
  const recentJobActions = {
    recoverActiveJob() {},
    selectJob() {},
    deleteJob() {},
    openJobReader() {},
  };

  try {
    const result = commitRecentJobsPage({
      reset: true,
      collected: [{ job_id: "job-store-rendered", status: "succeeded" }],
      hasMore: false,
      invocationSummary: { stage_spec_count: 7, unknown_count: 2 },
      nextOffset: 10,
      recentJobActions,
      runtimePatches,
      activeRefreshLoop: () => ({
        schedule() {},
        stop() {},
      }),
      scheduleAutoLoadIfNeeded() {},
      recentJobsStatePort: statePort,
      storeDrivenRendering: true,
    });

    assert.deepEqual(result.nextItems.map((item) => item.job_id), ["job-store-rendered"]);
    assert.deepEqual(storeRenders, [
      {
        items: ["job-store-rendered"],
        invocationSummary: { stage_spec_count: 7, unknown_count: 2 },
        hasMore: false,
      },
    ]);
  } finally {
    renderer.unmount();
  }
});

test("recent jobs page commit can route rendering through the view port", () => {
  const statePort = createRecentJobsStatePort({
    recentJobsOffset: 0,
    recentJobsHasMore: true,
    recentJobsItems: [],
  });
  const rendered = [];
  const result = commitRecentJobsPage({
    reset: true,
    collected: [{ job_id: "job-view-port-commit", status: "succeeded" }],
    hasMore: false,
    nextOffset: 10,
    recentJobActions: {
      recoverActiveJob() {},
      selectJob() {},
      deleteJob() {},
      openJobReader() {},
    },
    runtimePatches: createRecentJobsRuntimePatches({
      statePort,
      replaceRecentJobCard: () => false,
      renderCurrentRecentJobs() {},
      scheduleActiveRefresh() {},
    }),
    activeRefreshLoop: () => ({
      schedule() {},
      stop() {},
    }),
    scheduleAutoLoadIfNeeded() {},
    recentJobsStatePort: statePort,
    viewPort: {
      renderList(payload) {
        rendered.push(payload.items.map((item) => item.job_id));
      },
    },
  });

  assert.deepEqual(result.nextItems.map((item) => item.job_id), ["job-view-port-commit"]);
  assert.deepEqual(rendered, [["job-view-port-commit"]]);
});

test("recent jobs page commit appends only collected items while preserving state patches", () => {
  const previousDocument = global.document;
  const nodes = new Map();
  const rendered = [];
  const list = {
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
    addEventListener() {},
    append(fragment) {
      rendered.push(
        ...Array.from(fragment.children || []).map((node) => node.item?.job_id),
      );
    },
    querySelectorAll() { return []; },
  };
  const empty = { classList: { add() {}, remove() {}, toggle() {} }, textContent: "" };
  const loadMoreButton = {
    disabled: false,
    textContent: "",
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; },
    },
  };
  const libraryView = {
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
  };
  nodes.set("#library-view", libraryView);
  nodes.set("#library-view #recent-jobs-list", list);
  nodes.set("#recent-jobs-list", list);
  nodes.set("#recent-jobs-empty", empty);
  nodes.set("#load-more-jobs-btn", loadMoreButton);
  global.document = {
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
    createElement(tagName) {
      if (tagName === RECENT_JOBS_TAGS.card) {
        return { tagName, item: null };
      }
      return { tagName };
    },
    createDocumentFragment() {
      return {
        children: [],
        append(node) {
          this.children.push(node);
        },
      };
    },
  };

  const statePort = createRecentJobsStatePort({
    recentJobsOffset: 24,
    recentJobsHasMore: true,
    recentJobsItems: [
      { job_id: "job-created-active", status: "running" },
      { job_id: "job-existing", status: "succeeded" },
    ],
  });
  const runtimePatches = createRecentJobsRuntimePatches({
    statePort,
    replaceRecentJobCard: () => false,
    renderCurrentRecentJobs() {},
    scheduleActiveRefresh() {},
  });
  runtimePatches.insert({
    job_id: "job-created-active",
    status: "running",
    display_stage: "ocr",
    progress: { current: 1, total: 10, unit: "page" },
  });
  rendered.length = 0;

  try {
    const result = commitRecentJobsPage({
      reset: false,
      collected: [{ job_id: "job-page-2", status: "succeeded" }],
      hasMore: false,
      nextOffset: 48,
      recentJobActions: {
        recoverActiveJob() {},
        selectJob() {},
        deleteJob() {},
        openJobReader() {},
      },
      runtimePatches,
      activeRefreshLoop: () => ({
        schedule() {},
        stop() {},
      }),
      scheduleAutoLoadIfNeeded() {},
      recentJobsStatePort: statePort,
    });

    assert.deepEqual(rendered, ["job-page-2"]);
    assert.deepEqual(result.nextItems.map((item) => item.job_id), [
      "job-created-active",
      "job-existing",
      "job-page-2",
    ]);
    assert.deepEqual(result.renderItems.map((item) => item.job_id), ["job-page-2"]);
  } finally {
    global.document = previousDocument;
  }
});

test("recent jobs empty commit owns empty state and search copy", () => {
  const previousDocument = global.document;
  const nodes = new Map();
  const loadingStates = [];
  const list = {
    innerHTML: "previous",
    classList: {
      added: [],
      removed: [],
      add(value) { this.added.push(value); },
      remove(value) { this.removed.push(value); },
      toggle() {},
    },
  };
  const empty = {
    textContent: "",
    classList: {
      added: [],
      removed: [],
      add(value) { this.added.push(value); },
      remove(value) { this.removed.push(value); },
      toggle() {},
    },
  };
  const loadMoreButton = {
    disabled: true,
    textContent: "",
    classList: {
      added: [],
      removed: [],
      add(value) { this.added.push(value); },
      remove(value) { this.removed.push(value); },
      toggle() {},
    },
  };
  const libraryView = {
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
  };
  nodes.set("#library-view", libraryView);
  nodes.set("#library-view #recent-jobs-list", list);
  nodes.set("#recent-jobs-list", list);
  nodes.set("#recent-jobs-empty", empty);
  nodes.set("#load-more-jobs-btn", loadMoreButton);
  global.document = {
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
  };
  const statePort = createRecentJobsStatePort({
    recentJobsItems: [{ job_id: "old" }],
    recentJobsHasMore: true,
  });

  try {
    const result = commitRecentJobsEmpty({
      query: "quantum",
      invocationSummary: null,
      homeStatePort: {
        setRecentJobsLoadingState: (...args) => loadingStates.push(args),
      },
      recentJobsStatePort: statePort,
    });

    assert.equal(result.message, "没有匹配的书籍");
    assert.deepEqual(statePort.getSnapshot().items, []);
    assert.equal(statePort.getSnapshot().hasMore, false);
    assert.equal(empty.textContent, "没有匹配的书籍");
    assert.deepEqual(loadingStates, [["ready"]]);
  } finally {
    global.document = previousDocument;
  }
});

test("recent jobs empty commit can delegate rendering to view-state owner", () => {
  const loadingStates = [];
  const renders = [];
  const statePort = createRecentJobsStatePort({
    recentJobsItems: [{ job_id: "old" }],
    recentJobsHasMore: true,
  });

  const result = commitRecentJobsEmpty({
    query: "",
    invocationSummary: null,
    homeStatePort: {
      setRecentJobsLoadingState: (...args) => loadingStates.push(args),
    },
    recentJobsStatePort: statePort,
    storeDrivenRendering: true,
    renderEmpty: (...args) => renders.push(args),
  });

  assert.equal(result.message, "暂无最近任务");
  assert.deepEqual(statePort.getSnapshot().items, []);
  assert.equal(statePort.getSnapshot().hasMore, false);
  assert.deepEqual(loadingStates, [["ready"]]);
  assert.deepEqual(renders, []);
});

test("recent jobs no-more and error commits own terminal loading state", () => {
  const previousDocument = global.document;
  const nodes = new Map();
  const loadingStates = [];
  const list = {
    innerHTML: "existing",
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
  };
  const empty = {
    textContent: "",
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
  };
  const loadMoreButton = {
    disabled: false,
    textContent: "",
    classList: {
      added: [],
      add(value) { this.added.push(value); },
      remove() {},
      toggle() {},
    },
  };
  const libraryView = {
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
  };
  nodes.set("#library-view", libraryView);
  nodes.set("#library-view #recent-jobs-list", list);
  nodes.set("#recent-jobs-list", list);
  nodes.set("#recent-jobs-empty", empty);
  nodes.set("#load-more-jobs-btn", loadMoreButton);
  global.document = {
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
  };
  const statePort = createRecentJobsStatePort({
    recentJobsHasMore: true,
    recentJobsItems: [{ job_id: "job-existing" }],
  });
  const homeStatePort = {
    setRecentJobsLoadingState: (...args) => loadingStates.push(args),
  };

  try {
    commitRecentJobsNoMore({
      homeStatePort,
      recentJobsStatePort: statePort,
    });
    assert.equal(statePort.getSnapshot().hasMore, false);
    assert.deepEqual(loadingStates, [["ready"]]);
    assert.deepEqual(loadMoreButton.classList.added, ["hidden"]);

    commitRecentJobsError({
      error: new Error("network down"),
      reset: false,
      homeStatePort,
      recentJobsStatePort: statePort,
    });
    assert.deepEqual(loadingStates.at(-1), ["error", "network down"]);
  } finally {
    global.document = previousDocument;
  }
});

test("recent jobs no-more and error commits can delegate rendering", () => {
  const loadingStates = [];
  const renders = [];
  const statePort = createRecentJobsStatePort({
    recentJobsHasMore: true,
    recentJobsItems: [{ job_id: "job-existing" }],
  });
  const homeStatePort = {
    setRecentJobsLoadingState: (...args) => loadingStates.push(args),
  };

  commitRecentJobsNoMore({
    homeStatePort,
    recentJobsStatePort: statePort,
    storeDrivenRendering: true,
    renderError: (...args) => renders.push(args),
  });

  commitRecentJobsError({
    error: new Error("network down"),
    reset: false,
    homeStatePort,
    recentJobsStatePort: statePort,
    storeDrivenRendering: true,
    renderError: (...args) => renders.push(args),
  });

  assert.equal(statePort.getSnapshot().hasMore, false);
  assert.deepEqual(loadingStates, [
    ["ready"],
    ["error", "network down"],
  ]);
  assert.deepEqual(renders, []);
});

test("recent jobs loader preserves runtime patches that arrive during load-more", async () => {
  const previousDocument = global.document;
  const previousWindow = global.window;
  const nodes = new Map();
  const list = {
    innerHTML: "",
    addEventListener() {},
    querySelectorAll() { return []; },
  };
  const empty = { classList: { add() {}, remove() {}, toggle() {} }, textContent: "" };
  const loadMoreButton = {
    disabled: false,
    textContent: "",
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; },
    },
  };
  nodes.set("#library-view", null);
  nodes.set("#recent-jobs-list", list);
  nodes.set("#recent-jobs-empty", empty);
  nodes.set("#load-more-jobs-btn", loadMoreButton);
  global.document = {
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
  };
  global.window = {
    setTimeout(callback) {
      callback();
      return 1;
    },
  };

  let resolveLoad;
  const statePort = createRecentJobsStatePort({
    recentJobsOffset: 24,
    recentJobsHasMore: true,
    recentJobsItems: [{ job_id: "job-existing", status: "succeeded" }],
  });
  const runtimePatches = createRecentJobsRuntimePatches({
    statePort,
    replaceRecentJobCard: () => false,
    renderCurrentRecentJobs() {},
    scheduleActiveRefresh() {},
  });
  const loader = createRecentJobsLoader({
    apiPrefix: "/api/v1",
    fetchJobList: async () => ({ items: [] }),
    getQuery: () => "",
    recentJobActions: {
      recoverActiveJob() {},
      selectJob() {},
      deleteJob() {},
      openJobReader() {},
    },
    runtimePatches,
    activeRefreshLoop: () => ({ schedule() {}, stop() {} }),
    scheduleAutoLoadIfNeeded() {},
    homeStatePort: {
      setRecentJobsLoadingState() {},
    },
    recentJobsStatePort: statePort,
    libraryBooksResource: {
      async load() {
        await new Promise((resolve) => {
          resolveLoad = resolve;
        });
        return {
          status: "success",
          data: {
            collected: [{ job_id: "job-page-2", status: "succeeded" }],
            hasMore: false,
            latestInvocationSummary: null,
            nextOffset: 48,
          },
        };
      },
    },
  });

  try {
    const loadPromise = loader.load({ reset: false });
    await new Promise((resolve) => setImmediate(resolve));
    runtimePatches.insert({
      job_id: "job-created-during-load",
      status: "running",
      display_stage: "ocr",
      progress: { current: 1, total: 10, unit: "page" },
    });
    resolveLoad();
    await loadPromise;

    assert.deepEqual(statePort.getSnapshot().items.map((item) => item.job_id), [
      "job-created-during-load",
      "job-existing",
      "job-page-2",
    ]);
  } finally {
    global.document = previousDocument;
    global.window = previousWindow;
  }
});

test("recent jobs loader does not append runtime-created cards during load-more rendering", async () => {
  const previousDocument = global.document;
  const previousWindow = global.window;
  const rendered = [];
  const nodes = new Map();
  const list = {
    children: [],
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
    addEventListener() {},
    querySelectorAll() { return []; },
    append(fragment) {
      rendered.push(
        ...Array.from(fragment.children || []).map((node) => node.item?.job_id),
      );
    },
  };
  const empty = { classList: { add() {}, remove() {}, toggle() {} }, textContent: "" };
  const loadMoreButton = {
    disabled: false,
    textContent: "",
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; },
    },
  };
  const libraryView = {
    hidden: false,
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
  };
  nodes.set("#library-view", libraryView);
  nodes.set("#library-view #recent-jobs-list", list);
  nodes.set("#recent-jobs-list", list);
  nodes.set("#recent-jobs-empty", empty);
  nodes.set("#load-more-jobs-btn", loadMoreButton);
  global.document = {
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
    createElement(tagName) {
      if (tagName === RECENT_JOBS_TAGS.card) {
        return { tagName, item: null };
      }
      return { tagName };
    },
    createDocumentFragment() {
      return {
        children: [],
        append(node) {
          this.children.push(node);
        },
      };
    },
  };
  global.window = {
    setTimeout(callback) {
      callback();
      return 1;
    },
  };

  const statePort = createRecentJobsStatePort({
    recentJobsOffset: 24,
    recentJobsHasMore: true,
    recentJobsItems: [
      { job_id: "job-created-active", status: "running" },
      { job_id: "job-existing", status: "succeeded" },
    ],
  });
  const runtimePatches = createRecentJobsRuntimePatches({
    statePort,
    replaceRecentJobCard: () => false,
    renderCurrentRecentJobs() {},
    scheduleActiveRefresh() {},
  });
  runtimePatches.insert({
    job_id: "job-created-active",
    status: "running",
    display_stage: "ocr",
    progress: { current: 1, total: 10, unit: "page" },
  });
  rendered.length = 0;

  const loader = createRecentJobsLoader({
    apiPrefix: "/api/v1",
    fetchJobList: async () => ({ items: [] }),
    getQuery: () => "",
    recentJobActions: {
      recoverActiveJob() {},
      selectJob() {},
      deleteJob() {},
      openJobReader() {},
    },
    runtimePatches,
    activeRefreshLoop: () => ({ schedule() {}, stop() {} }),
    scheduleAutoLoadIfNeeded() {},
    homeStatePort: {
      setRecentJobsLoadingState() {},
    },
    recentJobsStatePort: statePort,
    libraryBooksResource: {
      async load() {
        return {
          status: "success",
          data: {
            collected: [{ job_id: "job-page-2", status: "succeeded" }],
            hasMore: false,
            latestInvocationSummary: null,
            nextOffset: 48,
          },
        };
      },
    },
  });

  try {
    await loader.load({ reset: false });

    assert.deepEqual(rendered, ["job-page-2"]);
    assert.deepEqual(statePort.getSnapshot().items.map((item) => item.job_id), [
      "job-created-active",
      "job-existing",
      "job-page-2",
    ]);
  } finally {
    global.document = previousDocument;
    global.window = previousWindow;
  }
});

test("recent jobs command handlers invalidate list resource before patching and refreshing", async () => {
  const handlers = {};
  const invalidations = [];
  const updates = [];
  const inserts = [];
  const refreshes = [];
  const fetches = [];
  const subscription = bindRecentJobsCommandHandlers({
    apiPrefix: "/api",
    commandPort: {
      subscribe(nextHandlers) {
        Object.assign(handlers, nextHandlers);
        return { destroy() {} };
      },
    },
    fetchJobPayload: async (jobId, apiPrefix) => {
      fetches.push([jobId, apiPrefix]);
      return { job_id: jobId, status: "running", hydrated: true };
    },
    libraryBooksResource: {
      invalidate: () => invalidations.push("invalidate"),
    },
    runtimePatches: {
      update: (job) => updates.push(job.job_id),
      insert: (job) => inserts.push(job.job_id),
    },
    refreshScheduler: {
      scheduleRefresh: (options) => refreshes.push(options),
    },
  });

  handlers.onRefreshRequested({ delay: 50, force: true });
  handlers.onJobUpdated({ job: { job_id: "job-updated" } });
  handlers.onJobCreated({ job: { job_id: "job-created" } });
  await Promise.resolve();
  subscription.destroy();

  assert.deepEqual(invalidations, ["invalidate", "invalidate", "invalidate"]);
  assert.deepEqual(fetches, [["job-created", "/api"]]);
  assert.deepEqual(updates, ["job-updated", "job-created"]);
  assert.deepEqual(inserts, ["job-created"]);
  assert.deepEqual(refreshes, [
    { delay: 50, force: true },
    { delay: 300, bypassThrottle: true },
    { delay: 1200, force: true },
  ]);
});

test("recent jobs command update refreshes the current card without opening detail", async () => {
  const handlers = {};
  const renders = [];
  const opened = [];
  const statePort = createRecentJobsStatePort({
    recentJobsItems: [
      {
        job_id: "job-current",
        status: "running",
        display_stage: "translation",
        progress: { unit: "batch", current: 1, total: 10 },
      },
    ],
    recentJobsHasMore: true,
  });
  const renderer = createRecentJobsStoreRenderer({
    recentJobsStatePort: statePort,
    renderRecentJobsList: (payload) => renders.push(payload.items.map((item) => ({
      job_id: item.job_id,
      status: item.status,
      progress: item.progress,
    }))),
    actions: {
      selectJob: (jobId) => opened.push(["select", jobId]),
      deleteJob() {},
      openJobReader: (jobId) => opened.push(["reader", jobId]),
    },
  });
  const runtimePatches = createRecentJobsRuntimePatches({
    statePort,
    replaceRecentJobCard: () => false,
    renderCurrentRecentJobs() {},
    scheduleActiveRefresh() {},
    storeDrivenRendering: true,
    stageAdapterPort: recentJobsStageAdapterPort,
  });

  try {
    bindRecentJobsCommandHandlers({
      apiPrefix: "/api",
      commandPort: {
        subscribe(nextHandlers) {
          Object.assign(handlers, nextHandlers);
          return { destroy() {} };
        },
      },
      fetchJobPayload: async () => {
        throw new Error("updated jobs should not need hydration");
      },
      libraryBooksResource: {
        invalidate() {},
      },
      runtimePatches,
      refreshScheduler: {
        scheduleRefresh() {},
      },
    });

    handlers.onJobUpdated({
      job: {
        job_id: "job-current",
        status: "running",
        display_stage: "translation",
        substage: "translation_batches",
        progress: { unit: "batch", current: 5, total: 10, percent: 50 },
      },
    });

    const updated = statePort.getSnapshot().items[0];
    assert.equal(updated.job_id, "job-current");
    assert.equal(updated.status, "running");
    assert.equal(updated.progress.current, 5);
    assert.equal(updated.progress.total, 10);
    assert.equal(updated.progress.unit, "batch");
    assert.deepEqual(opened, []);
    assert.equal(renders.length, 1);
    assert.equal(renders[0][0].progress.current, 5);
  } finally {
    renderer.unmount();
  }
});

test("recent jobs runtime patches keep newer event progress over older poll snapshots", () => {
  const statePort = createRecentJobsStatePort({
    recentJobsItems: [
      {
        job_id: "job-monotonic-card",
        status: "running",
        display_stage: "translation",
        substage: "translation_batches",
        progress: { unit: "batch", current: 1, total: 10, percent: 10 },
      },
    ],
  });
  const patches = createRecentJobsRuntimePatches({
    statePort,
    replaceRecentJobCard: () => true,
    renderCurrentRecentJobs() {},
    scheduleActiveRefresh() {},
    storeDrivenRendering: true,
    stageAdapterPort: recentJobsStageAdapterPort,
  });

  patches.update({
    job_id: "job-monotonic-card",
    status: "running",
    display_stage: "translation",
    substage: "translation_batches",
    progress: { unit: "batch", current: 8, total: 10, percent: 80 },
    stage_snapshot: {
      stageKey: "translate",
      publicStage: "translation",
      source: "display-state",
      lane: "main",
      substage: "translation_batches",
      detail: "正在翻译正文内容",
      progress: { unit: "batch", current: 8, total: 10, percent: 80 },
    },
  });
  patches.update({
    job_id: "job-monotonic-card",
    status: "running",
    display_stage: "translation",
    substage: "translation_batches",
    progress: { unit: "batch", current: 5, total: 10, percent: 50 },
  });

  const item = statePort.getSnapshot().items[0];
  assert.equal(item.progress.current, 8);
  assert.equal(item.progress.percent, 80);
  assert.equal(item.runtime_status.progress.current, 8);
  assert.equal(item.runtime_status.progress.percent, 80);
});

test("recent jobs runtime patches keep newer progress while accepting newer substage text", () => {
  const statePort = createRecentJobsStatePort({
    recentJobsItems: [
      {
        job_id: "job-monotonic-text",
        status: "running",
        display_stage: "translation",
        substage: "translation_batches",
        progress: { unit: "batch", current: 8, total: 10, percent: 80 },
      },
    ],
  });
  const patches = createRecentJobsRuntimePatches({
    statePort,
    replaceRecentJobCard: () => true,
    renderCurrentRecentJobs() {},
    scheduleActiveRefresh() {},
    storeDrivenRendering: true,
    stageAdapterPort: recentJobsStageAdapterPort,
  });

  patches.update({
    job_id: "job-monotonic-text",
    status: "running",
    display_stage: "translation",
    substage: "translation_batches",
    progress: { unit: "batch", current: 8, total: 10, percent: 80 },
    stage_snapshot: {
      stageKey: "translate",
      publicStage: "translation",
      source: "display-state",
      lane: "main",
      substage: "translation_batches",
      detail: "正在翻译正文内容",
      progress: { unit: "batch", current: 8, total: 10, percent: 80 },
    },
  });
  patches.update({
    job_id: "job-monotonic-text",
    status: "running",
    display_stage: "translation",
    substage: "garbled_repair",
    stage_detail: "正在修复翻译结果",
    progress: { unit: "batch", current: 5, total: 10, percent: 50 },
    stage_snapshot: {
      stageKey: "translate",
      publicStage: "translation",
      source: "display-state",
      lane: "main",
      substage: "garbled_repair",
      detail: "正在修复翻译结果",
      progress: { unit: "batch", current: 5, total: 10, percent: 50 },
    },
  });

  const item = statePort.getSnapshot().items[0];
  assert.equal(item.progress.current, 8);
  assert.equal(item.progress.percent, 80);
  assert.equal(item.runtime_status.substage, "garbled_repair");
  assert.equal(item.runtime_status.detail, "正在修复乱码候选段");
  assert.equal(item.runtime_status.progress.current, 8);
  assert.equal(item.runtime_status.progress.percent, 80);
});

test("recent jobs runtime patches keep terminal state over stale running snapshots", () => {
  const statePort = createRecentJobsStatePort({
    recentJobsItems: [
      {
        job_id: "job-terminal-card",
        status: "running",
        display_stage: "translation",
        progress: { unit: "batch", current: 9, total: 10, percent: 90 },
      },
    ],
  });
  const patches = createRecentJobsRuntimePatches({
    statePort,
    replaceRecentJobCard: () => true,
    renderCurrentRecentJobs() {},
    scheduleActiveRefresh() {},
    storeDrivenRendering: true,
    stageAdapterPort: recentJobsStageAdapterPort,
  });

  patches.update({
    job_id: "job-terminal-card",
    status: "succeeded",
    display_stage: "done",
    progress: { unit: "batch", current: 10, total: 10, percent: 100 },
  });
  patches.update({
    job_id: "job-terminal-card",
    status: "running",
    display_stage: "translation",
    substage: "translation_batches",
    progress: { unit: "batch", current: 9, total: 10, percent: 90 },
  });

  const item = statePort.getSnapshot().items[0];
  assert.equal(item.status, "succeeded");
  assert.equal(item.display_stage, "done");
  assert.equal(item.progress.percent, 100);
  assert.equal(item.runtime_status.stageKey, "done");
});

test("created recent job hydration fetches full payload and patches the card", async () => {
  const updates = [];
  const payload = await hydrateCreatedRecentJob({
    job: { job_id: "job-created" },
    apiPrefix: "/api",
    fetchJobPayload: async (jobId, apiPrefix) => ({
      job_id: jobId,
      apiPrefix,
      cover_url: `/api/v1/jobs/${jobId}/cover`,
      progress: { current: 1, total: 9 },
    }),
    runtimePatches: {
      update: (job) => updates.push(job),
    },
  });

  assert.equal(payload.job_id, "job-created");
  assert.equal(payload.apiPrefix, "/api");
  assert.deepEqual(updates, [payload]);
});

test("created recent job hydration is best effort", async () => {
  const updates = [];
  const payload = await hydrateCreatedRecentJob({
    job: { job_id: "job-created" },
    fetchJobPayload: async () => {
      throw new Error("not ready");
    },
    runtimePatches: {
      update: (job) => updates.push(job),
    },
  });

  assert.equal(payload, null);
  assert.deepEqual(updates, []);
});

test("recent jobs feature bindings route ui library and workflow events", () => {
  const previousDocument = global.document;
  const previousWindow = global.window;
  const listeners = new Map();
  const nodes = new Map();
  const loadCalls = [];
  const commandCalls = [];
  const schedulerCalls = [];
  const loadMoreButton = {
    listeners: new Map(),
    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    },
  };
  const openButton = {
    addEventListener() {},
  };
  nodes.set("#open-query-btn", openButton);
  nodes.set("#load-more-jobs-btn", loadMoreButton);
  nodes.set("#library-search-input", {
    addEventListener() {},
  });
  nodes.set("#library-view", {
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
  });
  nodes.set("#library-view #recent-jobs-list", {});
  const doc = {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    getElementById(id) {
      return nodes.get(`#${id}`) || null;
    },
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
  };
  global.document = doc;
  global.window = {
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
  };
  const commandPort = {
    subscribe(handlers) {
      this.handlers = handlers;
      return { destroy() {} };
    },
    requestRefresh: (detail) => commandCalls.push(["refresh", detail]),
    publishJobUpdated: (job) => commandCalls.push(["updated", job]),
    publishJobCreated: (job) => commandCalls.push(["created", job]),
  };
  const libraryRefreshPort = {
    subscribe(handlers) {
      this.handlers = handlers;
      return { destroy() {} };
    },
  };
  const refreshScheduler = {
    openDialog() {},
    scheduleRefresh: (options) => schedulerCalls.push(["schedule", options]),
    setSuspended: (value) => schedulerCalls.push(["suspended", value]),
    isSuspended: () => false,
    updateSearch() {},
  };

  try {
    bindRecentJobsFeatureEvents({
      commandPort,
      doc,
      libraryBooksResource: {},
      libraryRefreshPort,
      refreshScheduler,
      runtime: {
        loadRecentJobs: (options) => loadCalls.push(options),
        runtimePatches: {
          insert() {},
          update() {},
        },
      },
    });

    loadMoreButton.listeners.get("click")();
    libraryRefreshPort.handlers.onRefreshRequested({ delay: 80, force: true });
    libraryRefreshPort.handlers.onJobUpdated({ job: { job_id: "job-updated" } });
    libraryRefreshPort.handlers.onJobCreated({ job: { job_id: "job-created" } });
    listeners.get(APP_EVENTS.statusAreaVisibilityChanged)();
    listeners.get(APP_EVENTS.openTranslationWorkflow)();
    listeners.get(APP_EVENTS.closeTranslationWorkflow)();

    assert.deepEqual(loadCalls, [{ reset: false }]);
    assert.deepEqual(commandCalls, [
      ["refresh", { delay: 80, force: true }],
      ["updated", { job_id: "job-updated" }],
      ["created", { job_id: "job-created" }],
    ]);
    assert.deepEqual(schedulerCalls, [
      ["suspended", false],
      ["suspended", true],
      ["suspended", false],
      ["schedule", { delay: 300 }],
    ]);
  } finally {
    global.document = previousDocument;
    global.window = previousWindow;
  }
});

test("shared library event port publishes and normalizes app events", () => {
  const previousCustomEvent = global.CustomEvent;
  const listeners = new Map();
  const dispatched = [];
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  const target = {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) {
        listeners.delete(type);
      }
    },
    dispatchEvent(event) {
      dispatched.push(event);
      listeners.get(event.type)?.(event);
    },
  };

  try {
    const calls = [];
    const port = createLibraryEventPort({ target });
    const subscription = port.subscribe({
      onRefreshRequested: (detail) => calls.push(["refresh", detail]),
      onJobUpdated: (detail) => calls.push(["updated", detail]),
      onJobCreated: (detail) => calls.push(["created", detail]),
    });

    port.requestRefresh({ delay: "350", force: true });
    port.publishJobUpdated({ job_id: "job-updated" });
    port.publishJobCreated({ job_id: "job-created" });
    port.publishJobUpdated(null);

    assert.deepEqual(dispatched.map((event) => event.type), [
      APP_EVENTS.libraryRefreshRequested,
      APP_EVENTS.libraryJobUpdated,
      APP_EVENTS.libraryJobCreated,
    ]);
    assert.deepEqual(calls, [
      ["refresh", { delay: 350, force: true }],
      ["updated", { job: { job_id: "job-updated" } }],
      ["created", { job: { job_id: "job-created" } }],
    ]);

    subscription.destroy();
    assert.equal(listeners.size, 0);
  } finally {
    global.CustomEvent = previousCustomEvent;
  }
});

test("shared library refresh helper throttles non-terminal refreshes", () => {
  const previousCustomEvent = global.CustomEvent;
  const previousDateNow = Date.now;
  const dispatched = [];
  let now = 1000;
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  Date.now = () => now;
  const port = createLibraryEventPort({
    target: {
      dispatchEvent(event) {
        dispatched.push(event);
      },
      addEventListener() {},
      removeEventListener() {},
    },
  });
  const state = { lastLibraryRefreshRequestedAt: 0 };

  try {
    assert.equal(requestThrottledLibraryRefresh(state, { port }), true);
    assert.equal(requestThrottledLibraryRefresh(state, { port }), false);
    now += 4000;
    assert.equal(requestThrottledLibraryRefresh(state, { port }), true);
    assert.equal(requestThrottledLibraryRefresh(state, { port, terminal: true }), true);
    assert.deepEqual(dispatched.map((event) => event.detail), [
      { delay: 800, force: false },
      { delay: 800, force: false },
      { delay: 200, force: false },
    ]);
  } finally {
    Date.now = previousDateNow;
    global.CustomEvent = previousCustomEvent;
  }
});

test("recent jobs runtime port normalizes active job commands", () => {
  const opened = [];
  let current = " job-current ";
  const port = createRecentJobsRuntimePort({
    openJob: (jobId) => opened.push(jobId),
    currentJobId: () => current,
  });

  assert.equal(port.currentJobId(), "job-current");
  assert.equal(port.openJob(" job-1 "), true);
  assert.equal(port.openJob(""), false);
  assert.deepEqual(opened, ["job-1"]);

  current = "";
  assert.equal(port.currentJobId(), "");
});

test("recent jobs reader port normalizes reader commands", () => {
  const opened = [];
  const port = createRecentJobsReaderPort({
    openReader: (jobId) => opened.push(jobId),
  });

  assert.equal(port.openReader(" job-reader "), true);
  assert.equal(port.openReader(""), false);
  assert.deepEqual(opened, ["job-reader"]);
});

test("recent jobs navigation port owns workflow reader and recovery side effects", () => {
  const previousCustomEvent = global.CustomEvent;
  const dispatched = [];
  const closed = [];
  const opened = [];
  const read = [];
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  const doc = {
    dispatchEvent(event) {
      dispatched.push(event.type);
    },
  };
  try {
    const port = createRecentJobsNavigationPort({
      closeDialog: () => closed.push("close"),
      doc,
      jobRuntimePort: {
        currentJobId: () => "job-current",
        openJob: (jobId) => {
          opened.push(jobId);
          return true;
        },
      },
      readerPort: {
        openReader: (jobId) => {
          read.push(jobId);
          return true;
        },
      },
    });

    assert.equal(port.currentJobId(), "job-current");
    assert.equal(port.openJob(" job-open "), true);
    assert.equal(port.openReader(" job-reader "), true);
    assert.equal(port.recoverJob(" job-recover "), true);
    assert.equal(port.openJob(""), false);
    assert.deepEqual(closed, ["close", "close"]);
    assert.deepEqual(dispatched, [APP_EVENTS.openTranslationWorkflow]);
    assert.deepEqual(opened, ["job-open", "job-recover"]);
    assert.deepEqual(read, ["job-reader"]);
  } finally {
    global.CustomEvent = previousCustomEvent;
  }
});

test("recent jobs runtime wires loader actions and scheduler callbacks", async () => {
  const previousDocument = global.document;
  const previousWindow = global.window;
  const previousCustomEvent = global.CustomEvent;
  const nodes = new Map();
  const dispatched = [];
  const list = {
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
    addEventListener() {},
    append() {},
    querySelectorAll() { return []; },
    replaceChildren() {},
  };
  const empty = { classList: { add() {}, remove() {}, toggle() {} }, textContent: "" };
  const loadMoreButton = {
    disabled: false,
    textContent: "",
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; },
    },
  };
  const libraryView = {
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
  };
  nodes.set("#library-view", libraryView);
  nodes.set("#library-view #recent-jobs-list", list);
  nodes.set("#recent-jobs-list", list);
  nodes.set("#recent-jobs-empty", empty);
  nodes.set("#load-more-jobs-btn", loadMoreButton);
  global.document = {
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
    dispatchEvent(event) {
      dispatched.push(event);
    },
    createElement(tagName) {
      if (tagName === RECENT_JOBS_TAGS.card) {
        return { tagName, item: null };
      }
      return { tagName };
    },
    createDocumentFragment() {
      return {
        children: [],
        append(node) {
          this.children.push(node);
        },
      };
    },
  };
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  global.window = {
    setTimeout(callback) {
      callback();
      return 1;
    },
  };

  const loadParams = [];
  const closed = [];
  const opened = [];
  const statePort = createRecentJobsStatePort({
    recentJobsOffset: 0,
    recentJobsHasMore: true,
    recentJobsItems: [],
  });
  let scheduler = null;
  const runtime = createRecentJobsRuntime({
    fetchJobList: async () => ({ items: [] }),
    fetchJobPayload: async () => ({}),
    fetchLibraryBookList: async () => ({ items: [] }),
    deleteLibraryBook: async () => ({}),
    apiPrefix: "/api/v1",
    currentJobId: () => "",
    jobRuntimePort: {
      openJob: (jobId) => opened.push(jobId),
    },
    readerPort: {
      openReader() {},
    },
    homeStatePort: {
      setRecentJobsLoadingState() {},
    },
    recentJobsStatePort: statePort,
    libraryBooksResource: {
      async load(params) {
        loadParams.push(params);
        return {
          status: "success",
          data: {
            collected: [{ job_id: "job-runtime", status: "succeeded" }],
            hasMore: false,
            latestInvocationSummary: null,
            nextOffset: 24,
          },
        };
      },
    },
    refreshSchedulerRef: () => scheduler,
  });
  scheduler = {
    closeDialog: () => closed.push("close"),
    getQuery: () => "search-term",
    scheduleAutoLoadIfNeeded() {},
  };

  try {
    await runtime.loadRecentJobs({ reset: true });
    runtime.recentJobActions.selectJob("job-runtime");

    assert.equal(loadParams[0].query, "search-term");
    assert.deepEqual(statePort.getSnapshot().items.map((item) => item.job_id), ["job-runtime"]);
    assert.deepEqual(closed, ["close"]);
    assert.deepEqual(opened, ["job-runtime"]);
    assert.deepEqual(dispatched.map((event) => event.type), [APP_EVENTS.openTranslationWorkflow]);
  } finally {
    global.document = previousDocument;
    global.window = previousWindow;
    global.CustomEvent = previousCustomEvent;
  }
});

test("recent jobs runtime routes list rendering through the view port", async () => {
  const rendered = [];
  const replaced = [];
  const statePort = createRecentJobsStatePort({
    recentJobsOffset: 0,
    recentJobsHasMore: true,
    recentJobsItems: [],
  });
  let scheduler = null;
  const runtime = createRecentJobsRuntime({
    fetchJobList: async () => ({ items: [] }),
    fetchJobPayload: async () => ({}),
    fetchLibraryBookList: async () => ({ items: [] }),
    deleteLibraryBook: async () => ({}),
    apiPrefix: "/api/v1",
    currentJobId: () => "",
    jobRuntimePort: {
      openJob() {},
    },
    readerPort: {
      openReader() {},
    },
    homeStatePort: {
      setRecentJobsLoadingState() {},
    },
    recentJobsStatePort: statePort,
    libraryBooksResource: {
      async load() {
        return {
          status: "success",
          data: {
            collected: [{ job_id: "job-view-port", status: "running" }],
            hasMore: false,
            latestInvocationSummary: null,
            nextOffset: 10,
          },
        };
      },
    },
    refreshSchedulerRef: () => scheduler,
    viewPort: {
      hasView: () => true,
      renderEmpty() {},
      renderError(message) {
        throw new Error(`unexpected recent jobs error render: ${message}`);
      },
      renderList(payload) {
        rendered.push(payload.items.map((item) => item.job_id));
      },
      renderLoading() {},
      replaceCard(item) {
        replaced.push(item.job_id);
        return true;
      },
      setLoadMoreLoading() {},
    },
  });
  scheduler = {
    closeDialog() {},
    getQuery: () => "",
    scheduleAutoLoadIfNeeded() {},
  };

  await runtime.loadRecentJobs({ reset: true });
  runtime.runtimePatches.update({ job_id: "job-view-port", status: "succeeded" });

  assert.deepEqual(rendered.at(-1), ["job-view-port"]);
  assert.deepEqual(replaced, []);
});

test("recent job actions use navigation port instead of direct polling", () => {
  const opened = [];

  const actions = createRecentJobActions({
    apiPrefix: "/api/v1",
    deleteLibraryBook: async () => {},
    startPolling: () => {
      throw new Error("recent-jobs actions should use navigationPort.openJob");
    },
    currentJobId: () => "legacy-current",
    navigationPort: {
      currentJobId: () => "",
      openJob: (jobId) => {
        opened.push(["open", jobId]);
        return true;
      },
      recoverJob: (jobId) => {
        opened.push(["recover", jobId]);
        return true;
      },
    },
    closeRecentJobsDialog: () => {},
    renderCurrentRecentJobs: () => {},
    renderRecentJobsEmpty: () => {},
    renderRecentJobsError: () => {},
    statePort: {
      getSnapshot: () => ({ items: [] }),
      removeJobFamily() {},
      setItems() {},
    },
  });

  actions.selectJob(" job-selected ");
  actions.recoverActiveJob([{ job_id: "job-recover", status: "running" }]);
  actions.recoverActiveJob([{ job_id: "job-ignored", status: "running" }]);

  assert.deepEqual(opened, [["open", "job-selected"], ["recover", "job-recover"]]);
});

test("recent job actions use navigation port instead of direct reader callback", () => {
  const opened = [];
  const errors = [];
  const actions = createRecentJobActions({
    apiPrefix: "/api/v1",
    deleteLibraryBook: async () => {},
    startPolling: () => {},
    openReader: () => {
      throw new Error("recent-jobs actions should use readerPort.openReader");
    },
    jobRuntimePort: {
      currentJobId: () => "",
      openJob: () => true,
    },
    navigationPort: {
      currentJobId: () => "",
      openReader: (jobId) => {
        opened.push(jobId);
        return true;
      },
    },
    closeRecentJobsDialog: () => {},
    renderCurrentRecentJobs: () => {},
    renderRecentJobsEmpty: () => {},
    renderRecentJobsError: (message) => errors.push(message),
    statePort: {
      getSnapshot: () => ({ items: [] }),
      removeJobFamily() {},
      setItems() {},
    },
  });

  actions.openJobReader(" job-reader ");
  actions.openJobReader("");

  assert.deepEqual(opened, ["job-reader"]);
  assert.deepEqual(errors, ["该任务缺少 job_id，无法打开对照阅读。"]);
});

test("recent jobs active refresh skips the current runtime job", async () => {
  const items = [
    { job_id: "job-current", status: "running" },
    { job_id: "job-other", status: "running" },
    { job_id: "job-done", status: "succeeded" },
  ];

  assert.deepEqual(
    recentJobsEligibleForActiveRefresh(items, "job-current").map((item) => item.job_id),
    ["job-other"],
  );

  const timers = [];
  const fetched = [];
  const updates = [];
  const loads = [];
  const environment = createRecentJobsRefreshEnvironment({
    clearTimeoutFn() {},
    setTimeoutFn(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
    isWorkflowOpen: () => false,
  });

  const loop = createActiveLibraryRefreshLoop({
    getItems: () => items,
    currentJobId: () => "job-current",
    fetchJobPayload: async (jobId) => {
      fetched.push(jobId);
      return { job_id: jobId, status: "running" };
    },
    apiPrefix: "/api/v1",
    updateFromRuntime: (job) => updates.push(job.job_id),
    loadRecentJobs: (options) => loads.push(options),
    isRecentJobsLoading: () => false,
    environment,
  });

  loop.schedule();
  assert.equal(timers.length, 1);
  timers[0].callback();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(fetched, ["job-other"]);
  assert.deepEqual(updates, ["job-other"]);
  assert.deepEqual(loads, [{ reset: true, silent: true }]);
  loop.stop();

  timers.length = 0;
  const currentOnlyLoop = createActiveLibraryRefreshLoop({
    getItems: () => [{ job_id: "job-current", status: "running" }],
    currentJobId: () => "job-current",
    fetchJobPayload: async () => {
      throw new Error("current job should not be fetched by active recent jobs refresh");
    },
    updateFromRuntime() {},
    loadRecentJobs() {},
    isRecentJobsLoading: () => false,
    environment,
  });
  currentOnlyLoop.schedule();
  assert.equal(timers.length, 0);
  currentOnlyLoop.stop();
});

test("recent jobs runtime patch rerenders the list when card replacement misses", () => {
  const statePort = createRecentJobsStatePort({
    recentJobsOffset: 10,
    recentJobsHasMore: true,
    recentJobsItems: [
      {
        job_id: "job-rerender-miss",
        status: "running",
        stage: "ocr",
        stage_detail: "OCR 中",
        progress: { current: 1, total: 10, percent: 10, unit: "page" },
      },
    ],
  });
  const renders = [];
  const patches = createRecentJobsRuntimePatches({
    statePort,
    replaceRecentJobCard: () => false,
    renderCurrentRecentJobs: (options) => renders.push(options),
    scheduleActiveRefresh() {},
    stageAdapterPort: recentJobsStageAdapterPort,
  });

  patches.update({
    job_id: "job-rerender-miss",
    status: "running",
    display_stage: "translation",
    substage: "translation_batches",
    progress: { current: 4, total: 20, unit: "batch" },
  });

  const item = statePort.getSnapshot().items[0];
  assert.equal(item.stage, "translate");
  assert.deepEqual(item.progress, {
    current: 4,
    total: 20,
    percent: 20,
    unit: "batch",
  });
  assert.deepEqual(renders, [{ reset: true }]);
});

test("recent jobs runtime patches keep active created jobs across reset refreshes", () => {
  const statePort = createRecentJobsStatePort({
    recentJobsItems: [],
    recentJobsHasMore: true,
  });
  const patches = createRecentJobsRuntimePatches({
    statePort,
    replaceRecentJobCard: () => false,
    renderCurrentRecentJobs() {},
    scheduleActiveRefresh() {},
    stageAdapterPort: recentJobsStageAdapterPort,
  });

  patches.insert({
    job_id: "job-created-active",
    status: "running",
    display_stage: "ocr",
    progress: { current: 1, total: 10, unit: "page" },
  });

  const refreshedItems = patches.apply([
    { job_id: "job-existing", status: "succeeded", display_stage: "done" },
  ]);

  assert.deepEqual(refreshedItems.map((item) => item.job_id), [
    "job-created-active",
    "job-existing",
  ]);
  assert.equal(refreshedItems[0].stage, "ocr");
  assert.equal(refreshedItems[0].status, "running");
});

test("recent jobs runtime patches keep translation card state over background render prewarm", () => {
  const previous = mergeLibraryJobItem({
    job_id: "job-parallel-recent",
    title: "parallel.pdf",
    display_name: "parallel.pdf",
    status: "running",
    stage: "translate",
    display_stage: "translation",
    lane: "main",
    substage: "translation_batches",
    progress: {
      unit: "batch",
      current: 120,
      total: 900,
      percent: 13.3333333333,
    },
  }, {
    job_id: "job-parallel-recent",
    status: "running",
    display_stage: "translation",
    lane: "main",
    substage: "translation_batches",
    progress: {
      unit: "batch",
      current: 120,
      total: 900,
      percent: 13.3333333333,
    },
  }, { stageAdapterPort: { adaptJobStageSnapshot } });

  const merged = mergeLibraryJobItem(previous, {
    job_id: "job-parallel-recent",
    status: "running",
    lane: "background",
    display_stage: "render",
    stage: "render_preprocess",
    substage: "render_prewarm",
    progress: {
      unit: "step",
      current: 2,
      total: 3,
      percent: 66.6666666667,
    },
  }, { stageAdapterPort: { adaptJobStageSnapshot } });

  assert.equal(stageKeyForRecentJobLabel(merged), "translate");
  assert.equal(recentJobStageLabel(merged), "翻译中");
  assert.equal(merged.display_stage, "translation");
  assert.equal(merged.lane, "main");
  assert.equal(merged.substage, "translation_batches");
  assert.equal(merged.runtime_status.stageKey, "translate");
  assert.equal(merged.runtime_status.lane, "main");
  assert.equal(merged.progress.unit, "batch");
  assert.equal(merged.progress.current, 120);
  assert.equal(merged.progress.total, 900);
  assert.equal(merged.background_stages.length, 1);
  assert.equal(merged.background_stages[0].display_stage, "render");
  assert.equal(merged.background_stages[0].substage, "render_prewarm");
  assert.equal(merged.background_stages[0].progress.current, 2);
});

test("recent jobs runtime patches keep completed created jobs until backend list catches up", () => {
  const statePort = createRecentJobsStatePort({
    recentJobsItems: [],
    recentJobsHasMore: true,
  });
  const patches = createRecentJobsRuntimePatches({
    statePort,
    replaceRecentJobCard: () => false,
    renderCurrentRecentJobs() {},
    scheduleActiveRefresh() {},
    stageAdapterPort: recentJobsStageAdapterPort,
  });

  patches.insert({
    job_id: "job-created-fast-complete",
    status: "running",
    display_stage: "translation",
    progress: { current: 9, total: 10, unit: "batch" },
  });
  patches.update({
    job_id: "job-created-fast-complete",
    status: "succeeded",
    display_stage: "done",
    progress: { current: 10, total: 10, unit: "batch", percent: 100 },
  });

  const refreshedItems = patches.apply([
    { job_id: "job-existing", status: "succeeded", display_stage: "done" },
  ]);

  assert.deepEqual(refreshedItems.map((item) => item.job_id), [
    "job-created-fast-complete",
    "job-existing",
  ]);
  assert.equal(refreshedItems[0].status, "succeeded");
  assert.equal(refreshedItems[0].display_stage, "done");
  assert.equal(refreshedItems[0].progress.percent, 100);
});

test("recent jobs runtime patches drive active cover overlay from created job to completion", () => {
  const statePort = createRecentJobsStatePort({
    recentJobsItems: [],
    recentJobsHasMore: true,
  });
  const mutations = [];
  const unsubscribe = statePort.subscribe((snapshot, meta = {}) => {
    mutations.push({
      action: meta.action,
      items: snapshot.items.map((item) => ({
        job_id: item.job_id,
        active: isRecentJobActive(item),
        label: recentJobStageLabel(item),
        percent: recentJobProgressPercent(item),
      })),
    });
  });
  const patches = createRecentJobsRuntimePatches({
    statePort,
    replaceRecentJobCard: () => true,
    renderCurrentRecentJobs() {},
    scheduleActiveRefresh() {},
    stageAdapterPort: recentJobsStageAdapterPort,
    storeDrivenRendering: true,
  });

  patches.insert({
    job_id: "job-created-overlay",
    status: "running",
    display_stage: "ocr",
    progress: { current: 1, total: 10, percent: 10, unit: "page" },
  });
  let item = statePort.getSnapshot().items[0];
  assert.equal(item.job_id, "job-created-overlay");
  assert.equal(isRecentJobActive(item), true);
  assert.equal(recentJobStageLabel(item), "OCR 中");
  assert.equal(recentJobProgressPercent(item), 10);

  patches.update({
    job_id: "job-created-overlay",
    status: "running",
    display_stage: "translation",
    substage: "translation_batches",
    progress: { current: 4, total: 20, percent: 20, unit: "batch" },
  });
  item = statePort.getSnapshot().items[0];
  assert.equal(isRecentJobActive(item), true);
  assert.equal(recentJobStageLabel(item), "翻译中");
  assert.equal(recentJobProgressPercent(item), 20);

  patches.update({
    job_id: "job-created-overlay",
    status: "succeeded",
    display_stage: "done",
    progress: { current: 20, total: 20, percent: 100, unit: "batch" },
  });
  item = statePort.getSnapshot().items[0];
  assert.equal(item.status, "succeeded");
  assert.equal(item.display_stage, "done");
  assert.equal(isRecentJobActive(item), false);
  assert.equal(recentJobStageLabel(item), "已完成");
  assert.equal(recentJobProgressPercent(item), 100);
  unsubscribe();
  const cardMutations = mutations.filter((entry) => entry.action === "prependItem" || entry.action === "replaceItem");
  assert.deepEqual(cardMutations.map((entry) => [entry.action, entry.items[0]?.active, entry.items[0]?.label, entry.items[0]?.percent]), [
    ["prependItem", true, "OCR 中", 10],
    ["replaceItem", true, "翻译中", 20],
    ["replaceItem", false, "已完成", 100],
  ]);
});

test("recent jobs runtime patches ignore ocr child jobs when inserting created cards", () => {
  const statePort = createRecentJobsStatePort({
    recentJobsItems: [],
    recentJobsHasMore: true,
  });
  const patches = createRecentJobsRuntimePatches({
    statePort,
    replaceRecentJobCard: () => true,
    renderCurrentRecentJobs() {},
    scheduleActiveRefresh() {},
    stageAdapterPort: recentJobsStageAdapterPort,
    storeDrivenRendering: true,
  });

  patches.insert({
    job_id: "job-parent-ocr",
    workflow: "ocr",
    status: "running",
    display_stage: "ocr",
    progress: { current: 1, total: 10, percent: 10, unit: "page" },
  });

  assert.deepEqual(statePort.getSnapshot().items, []);
  assert.deepEqual(patches.apply([{ job_id: "job-parent", status: "running" }]).map((item) => item.job_id), [
    "job-parent",
  ]);
});

test("recent jobs runtime patches do not let queued placeholders downgrade created running cards", () => {
  const statePort = createRecentJobsStatePort({
    recentJobsItems: [],
    recentJobsHasMore: true,
  });
  const patches = createRecentJobsRuntimePatches({
    statePort,
    replaceRecentJobCard: () => true,
    renderCurrentRecentJobs() {},
    scheduleActiveRefresh() {},
    stageAdapterPort: recentJobsStageAdapterPort,
    storeDrivenRendering: true,
  });

  patches.insert({
    job_id: "job-created-placeholder",
    status: "running",
    display_stage: "translation",
    source_file_name: "real-book.pdf",
    progress: { current: 4, total: 20, percent: 20, unit: "batch" },
  });
  patches.update({
    job_id: "job-created-placeholder",
    status: "queued",
    display_stage: "ocr",
    stage_detail: "正在读取任务状态...",
  });

  const item = statePort.getSnapshot().items[0];
  assert.equal(item.status, "running");
  assert.equal(item.display_stage, "translation");
  assert.equal(item.source_file_name, "real-book.pdf");
  assert.equal(item.progress.current, 4);
  assert.equal(item.progress.percent, 20);
  assert.equal(isRecentJobActive(item), true);
  assert.equal(recentJobStageLabel(item), "翻译中");
});

test("recent jobs refresh scheduler can bypass throttle without forcing suspended state", () => {
  const loads = [];
  const timers = [];
  let now = 10000;

  const environment = createRecentJobsRefreshEnvironment({
    now: () => now,
    clearTimeoutFn() {},
    setTimeoutFn(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
    isWorkflowOpen: () => false,
  });

  const scheduler = createRecentJobsRefreshScheduler({
    loadRecentJobs: (options) => loads.push(options),
    scheduleAutoLoadCheck() {},
    setDialogOpen() {},
    environment,
  });

  scheduler.scheduleRefresh({ delay: 10 });
  scheduler.scheduleRefresh({ delay: 20 });
  scheduler.scheduleRefresh({ delay: 30, bypassThrottle: true });
  assert.deepEqual(timers.map((timer) => timer.delay), [10, 30]);
  timers.forEach((timer) => timer.callback());
  assert.deepEqual(loads, [
    { reset: true, silent: true },
    { reset: true, silent: true },
  ]);

  const suspendedScheduler = createRecentJobsRefreshScheduler({
    loadRecentJobs: (options) => loads.push(options),
    scheduleAutoLoadCheck() {},
    setDialogOpen() {},
    environment,
  });
  suspendedScheduler.setSuspended(true);
  now += 10000;
  suspendedScheduler.scheduleRefresh({ delay: 40, bypassThrottle: true });
  assert.deepEqual(timers.map((timer) => timer.delay), [10, 30]);
});

test("recent jobs refresh scheduler pauses through injected workflow state", () => {
  const timers = [];
  const scheduler = createRecentJobsRefreshScheduler({
    loadRecentJobs() {},
    scheduleAutoLoadCheck() {},
    setDialogOpen() {},
    environment: createRecentJobsRefreshEnvironment({
      now: () => 10000,
      clearTimeoutFn() {},
      setTimeoutFn(callback, delay) {
        timers.push({ callback, delay });
        return timers.length;
      },
      isWorkflowOpen: () => true,
    }),
  });

  scheduler.scheduleRefresh({ delay: 10 });
  scheduler.scheduleRefresh({ delay: 20, force: true });

  assert.equal(scheduler.isSuspended(), true);
  assert.deepEqual(timers.map((timer) => timer.delay), [20]);
});

test("recent jobs workflow open port owns translation dialog DOM state", () => {
  const dialog = { dataset: { open: "1" } };
  const doc = {
    getElementById(id) {
      assert.equal(id, APP_DIALOG_IDS.translationWorkflow);
      return dialog;
    },
  };

  assert.equal(isTranslationWorkflowDialogOpen(doc), true);
  dialog.dataset.open = "0";
  assert.equal(isTranslationWorkflowDialogOpen(doc), false);
});

test("recent job stage labels use the shared public stage resolver", () => {
  const mergedItem = {
    status: "running",
    stage: "translate",
    display_stage: "render",
    substage: "render_prewarm",
    stage_detail: "render payload prewarm: ready",
  };
  assert.equal(stageKeyForRecentJobLabel(mergedItem), "render");
  assert.equal(recentJobStageLabel(mergedItem), "渲染中");
	  assert.equal(
	    recentJobStageLabel({
	      status: "running",
	      display_stage: "render",
	      stage: "render",
	      current_stage: "rendering",
	      stage_detail: "render payload prewarm: ready",
	      runtime_status: {
	        stageKey: "translate",
	        detail: "正在翻译正文内容",
	      },
	    }),
	    "渲染中",
	  );
  assert.equal(
    recentJobStageLabel({
      status: "running",
      display_stage: "translation",
      stage: "render",
      stage_detail: "",
    }),
    "翻译中",
  );
	  assert.equal(
	    recentJobStageLabel({
	      status: "running",
	      display_stage: "translation",
	      stage_snapshot: {
	        stageKey: "render",
	        publicStage: "render",
	      },
	    }),
	    "翻译中",
	  );
	  assert.equal(
	    recentJobStageLabel({
	      status: "running",
	      display_stage: "translation",
	      runtime_status: {
	        stageKey: "done",
	        publicStage: "done",
	        detail: "翻译 PDF 已生成",
	      },
	      stage_snapshot: {
	        stageKey: "render",
	        publicStage: "render",
	        source: "legacy-stage",
	      },
	    }),
	    "翻译中",
	  );
  assert.equal(
    recentJobStageLabel({
      status: "running",
      display_stage: "render",
      stage: "rendering",
    }),
    "渲染中",
  );
  assert.equal(
    recentJobStageLabel({
      status: "succeeded",
      display_stage: "done",
      stage: "rendering",
    }),
    "已完成",
  );
  assert.equal(
    stageKeyForRecentJobLabel({
      job_id: "job-new-contract-terminal-card",
      status: "succeeded",
      stage_snapshot: null,
      background_snapshots: [
        {
          display_stage: "render",
          lane: "background",
          progress: { current: 2, total: 3, percent: 66.66666666666666, unit: "step" },
        },
      ],
      output_pdf_ready: true,
    }),
    "done",
  );
  assert.equal(
    recentJobStageLabel({
      job_id: "job-new-contract-terminal-card",
      status: "succeeded",
      stage_snapshot: null,
      background_snapshots: [
        {
          display_stage: "render",
          lane: "background",
          progress: { current: 2, total: 3, percent: 66.66666666666666, unit: "step" },
        },
      ],
      output_pdf_ready: true,
    }),
    "已完成",
  );
  assert.equal(
    recentJobStatusLabel("cancelled"),
    "已取消",
  );
});

test("recent job card progress prefers runtime status view model", () => {
  assert.equal(
    recentJobProgressPercent({
      status: "running",
      progress: { current: 100, total: 100, percent: 100, unit: "page" },
      runtime_status: {
        progress: { current: 25, total: 100, percent: 25, unit: "batch" },
      },
    }),
    25,
  );
});

test("recent job covers avoid probing missing image endpoints without readiness", () => {
  assert.deepEqual(
    recentJobRawImageUrls({
      job_id: "job-cover",
      thumbnail_url: "",
      cover_url: "",
    }),
    [],
  );
});

test("recent job covers include stable fallback image endpoints when ready", () => {
  assert.deepEqual(
    recentJobRawImageUrls({
      job_id: "job-cover",
      thumbnail_ready: true,
      artifacts: {
        cover: { ready: true },
      },
    }),
    [
      "/api/v1/jobs/job-cover/thumbnail",
      "/api/v1/library/books/job-cover/thumbnail",
      "/api/v1/jobs/job-cover/cover",
      "/api/v1/library/books/job-cover/cover",
    ],
  );

  assert.deepEqual(
    recentJobRawImageUrls({
      job_id: "job-cover",
      thumbnail_url: "https://example.test/api/v1/library/books/job-cover/thumbnail",
      cover_url: "https://example.test/api/v1/library/books/job-cover/cover",
    }).slice(0, 2),
    [
      "https://example.test/api/v1/library/books/job-cover/thumbnail",
      "https://example.test/api/v1/library/books/job-cover/cover",
    ],
  );
});

test("job image API boundary builds and normalizes recent job cover candidates", () => {
  assert.deepEqual(
    buildJobImageCandidateUrls({
      job_id: "job api",
      thumbnail_url: "/custom/thumb.jpg",
      cover_url: "/custom/cover.jpg",
    }),
    [
      "/custom/thumb.jpg",
      "/custom/cover.jpg",
    ],
  );
  assert.deepEqual(
    buildJobImageCandidateUrls({
      job_id: "job api",
      thumbnail_ready: true,
      cover_ready: true,
    }),
    [
      "/api/v1/jobs/job%20api/thumbnail",
      "/api/v1/library/books/job%20api/thumbnail",
      "/api/v1/jobs/job%20api/cover",
      "/api/v1/library/books/job%20api/cover",
    ],
  );
  assert.equal(normalizeJobImageUrl("/api/v1/jobs/job-cover/cover"), "/api/v1/jobs/job-cover/cover");
});

test("recent job image cache can be invalidated for runtime card updates", async () => {
  const previousFetch = global.fetch;
  const previousUrl = global.URL;
  let fetchCount = 0;
  global.fetch = async () => {
    fetchCount += 1;
    return {
      ok: true,
      async blob() {
        return { fetchCount };
      },
    };
  };
  global.URL = {
    createObjectURL(blob) {
      return `blob:${blob.fetchCount}`;
    },
  };

  try {
    assert.equal(await loadRecentJobImage("/api/v1/jobs/job-cache/cover"), "blob:1");
    assert.equal(await loadRecentJobImage("/api/v1/jobs/job-cache/cover"), "blob:1");
    assert.equal(fetchCount, 1);

    clearRecentJobImageCache("/api/v1/jobs/job-cache/cover");
    assert.equal(await loadRecentJobImage("/api/v1/jobs/job-cache/cover"), "blob:2");
    assert.equal(fetchCount, 2);
  } finally {
    clearRecentJobImageCache("/api/v1/jobs/job-cache/cover");
    global.fetch = previousFetch;
    global.URL = previousUrl;
  }
});

test("recent job image cache keys include optional item version", async () => {
  const previousFetch = global.fetch;
  const previousUrl = global.URL;
  let fetchCount = 0;
  global.fetch = async () => {
    fetchCount += 1;
    return {
      ok: true,
      async blob() {
        return { fetchCount };
      },
    };
  };
  global.URL = {
    createObjectURL(blob) {
      return `blob:${blob.fetchCount}`;
    },
  };

  try {
    const rawUrl = "/api/v1/jobs/job-cache-version/cover";
    assert.equal(await loadRecentJobImage(rawUrl, { cacheVersion: "running|10" }), "blob:1");
    assert.equal(await loadRecentJobImage(rawUrl, { cacheVersion: "running|10" }), "blob:1");
    assert.equal(await loadRecentJobImage(rawUrl, { cacheVersion: "succeeded|100" }), "blob:2");
    assert.equal(fetchCount, 2);
  } finally {
    clearRecentJobImageCache("/api/v1/jobs/job-cache-version/cover");
    global.fetch = previousFetch;
    global.URL = previousUrl;
  }
});

test("recent job image refresh collects previous and next cover candidates", () => {
  const urls = recentJobImageRefreshUrls(
    {
      job_id: "job-image-refresh",
      cover_url: "/api/v1/jobs/job-image-refresh/old-cover",
      thumbnail_url: "/api/v1/jobs/job-image-refresh/old-thumbnail",
    },
    {
      job_id: "job-image-refresh",
      cover_url: "/api/v1/jobs/job-image-refresh/new-cover",
      thumbnail_url: "/api/v1/jobs/job-image-refresh/new-thumbnail",
    },
  );

  assert.ok(urls.includes("/api/v1/jobs/job-image-refresh/old-cover"));
  assert.ok(urls.includes("/api/v1/jobs/job-image-refresh/old-thumbnail"));
  assert.ok(urls.includes("/api/v1/jobs/job-image-refresh/new-cover"));
  assert.ok(urls.includes("/api/v1/jobs/job-image-refresh/new-thumbnail"));
});

test("recent jobs runtime merge consumes canonical stage snapshot", () => {
  const merged = mergeLibraryJobItem({
    job_id: "job-recent-stage",
    stage: "ocr",
    stage_detail: "旧状态",
    progress: { current: 2, total: 10, percent: 20, unit: "page" },
  }, {
    job_id: "job-recent-stage",
    status: "running",
    display_stage: "translation",
    stage: "render_preprocess",
    substage: "translation_batches",
    progress: { current: 28, total: 5216, unit: "batch" },
  }, { stageAdapterPort: recentJobsStageAdapterPort });

  assert.equal(merged.stage, "translate");
  assert.equal(merged.stage_detail, "正在翻译正文内容");
  assert.deepEqual(merged.runtime_status, {
    stageKey: "translate",
    publicStage: "translation",
    source: "display-stage",
    lane: "main",
    substage: "translation_batches",
    detail: "正在翻译正文内容",
    progress: {
      current: 28,
      total: 5216,
      percent: 28 / 5216 * 100,
      unit: "batch",
    },
  });
  assert.deepEqual(merged.progress, {
    current: 28,
    total: 5216,
    percent: 28 / 5216 * 100,
    unit: "batch",
  });

  const completed = mergeLibraryJobItem(merged, {
    job_id: "job-recent-stage",
    status: "succeeded",
    display_stage: "done",
    progress: { current: 89, total: 89, unit: "page" },
  }, { stageAdapterPort: recentJobsStageAdapterPort });
  assert.equal(completed.stage, "done");
  assert.equal(completed.progress.percent, 100);
  assert.equal(completed.progress.current, 89);
});

test("recent jobs runtime merge does not complete succeeded active stages", () => {
  const cases = [
    ["ocr", { display_stage: "ocr", stage: "ocr_processing", expectedStage: "ocr", unit: "page" }],
    ["translation", { display_stage: "translation", stage: "translating", expectedStage: "translate", unit: "batch" }],
    ["render", { display_stage: "render", stage: "rendering", expectedStage: "render", unit: "page" }],
  ];

  for (const [name, payload] of cases) {
    const merged = mergeLibraryJobItem({
      job_id: `job-${name}-subtask-card`,
      status: "queued",
      stage: payload.expectedStage,
      display_stage: payload.expectedStage === "translate" ? "translation" : payload.expectedStage,
      progress: { current: 0, total: 8, percent: 0, unit: payload.unit },
    }, {
      job_id: `job-${name}-subtask-card`,
      status: "succeeded",
      ...payload,
      substage: payload.stage,
      progress: { current: 2, total: 8, percent: 25, unit: payload.unit },
    }, { stageAdapterPort: recentJobsStageAdapterPort });

    assert.equal(merged.status, "succeeded", name);
    assert.equal(merged.stage, payload.expectedStage, name);
    assert.notEqual(merged.display_stage, "done", name);
    assert.equal(merged.progress.current, 2, name);
    assert.equal(merged.progress.total, 8, name);
    assert.equal(merged.progress.percent, 25, name);
    assert.equal(merged.runtime_status.stageKey, payload.expectedStage, name);
  }
});

test("recent jobs runtime merge does not promote canonical lane-only internal stage", () => {
  const merged = mergeLibraryJobItem({
    job_id: "job-recent-lane-only",
    stage: "translate",
    stage_detail: "正在翻译正文内容",
    progress: { current: 20, total: 100, percent: 20, unit: "batch" },
  }, {
    job_id: "job-recent-lane-only",
    status: "running",
    lane: "background",
    stage: "render_preprocess",
    substage: "render_prewarm",
    stage_detail: "render payload prewarm: ready",
    progress: { current: 1, total: 3, unit: "step" },
  }, { stageAdapterPort: recentJobsStageAdapterPort });

  assert.equal(merged.stage, "translate");
  assert.equal(merged.lane, undefined);
  assert.equal(merged.substage, undefined);
  assert.equal(merged.stage_detail, "正在翻译正文内容");
  assert.equal(merged.progress.current, 20);
  assert.equal(merged.progress.total, 100);
  assert.equal(merged.progress.unit, "batch");
  assert.deepEqual(merged.runtime_status, {});
  assert.equal(merged.background_stages, undefined);
});

test("recent jobs runtime snapshot mirrors the canonical adapter", () => {
  const job = {
    job_id: "job-recent-adapter",
    status: "running",
    display_stage: "translation",
    stage: "render_preprocess",
    substage: "translation_batches",
    progress: { current: 28, total: 5216, unit: "batch" },
  };
  const stageSnapshot = adaptJobStageSnapshot(job);
  const recentSnapshot = buildRecentJobRuntimeSnapshot(job, {
    stageAdapterPort: recentJobsStageAdapterPort,
  });

  assert.equal(recentSnapshot.stageKey, stageSnapshot.stageKey);
  assert.equal(recentSnapshot.detail, stageSnapshot.detail);
  assert.deepEqual(recentSnapshot.progress, stageSnapshot.progress);
});

test("recent jobs runtime snapshot prefers normalized stage snapshot", () => {
  const recentSnapshot = buildRecentJobRuntimeSnapshot({
    job_id: "job-recent-normalized-snapshot",
    status: "running",
    stage: "render_preprocess",
    stage_detail: "render payload prewarm: ready",
    stage_snapshot: {
      stageKey: "translate",
      publicStage: "translation",
      source: "public-stage",
      lane: "main",
      substage: "translation_batches",
      detail: "正在翻译正文内容",
      progress: {
        current: 30,
        total: 100,
        percent: 30,
        unit: "batch",
      },
    },
  });

  assert.equal(recentSnapshot.stageKey, "translate");
  assert.equal(recentSnapshot.detail, "正在翻译正文内容");
  assert.equal(recentSnapshot.progress.current, 30);
});

test("recent jobs runtime merge does not write raw internal stage over normalized snapshot", () => {
  const merged = mergeLibraryJobItem({
    job_id: "job-recent-normalized-merge",
    stage: "ocr",
    display_stage: "ocr",
    lane: "main",
    substage: "provider_processing",
    stage_detail: "OCR 处理中",
    progress: { current: 5, total: 100, percent: 5, unit: "page" },
  }, {
    job_id: "job-recent-normalized-merge",
    status: "running",
    stage: "render_preprocess",
    current_stage: "render_preprocess",
    stage_detail: "render payload prewarm: ready",
    progress: { current: 30, total: 100, percent: 30, unit: "batch" },
    stage_snapshot: {
      stageKey: "translate",
      publicStage: "translation",
      source: "public-stage",
      lane: "main",
      substage: "translation_batches",
      detail: "正在翻译正文内容",
      progress: {
        current: 30,
        total: 100,
        percent: 30,
        unit: "batch",
      },
    },
  });

  assert.equal(merged.stage, "translate");
  assert.equal(merged.display_stage, "translation");
  assert.equal(merged.lane, "main");
  assert.equal(merged.substage, "translation_batches");
  assert.equal(merged.stage_detail, "正在翻译正文内容");
  assert.equal(merged.runtime_status.stageKey, "translate");
  assert.equal(merged.runtime_status.substage, "translation_batches");
});

test("recent jobs runtime merge lets display stage override stale snapshot", () => {
  const merged = mergeLibraryJobItem({
    job_id: "job-recent-display-stage-wins",
    status: "running",
    display_stage: "ocr",
    stage: "ocr",
    progress: { current: 5, total: 100, percent: 5, unit: "page" },
  }, {
    job_id: "job-recent-display-stage-wins",
    status: "running",
    display_stage: "translation",
    stage: "render_preprocess",
    substage: "translation_batches",
    stage_detail: "正在翻译正文内容",
    progress: { current: 30, total: 100, percent: 30, unit: "batch" },
    runtime_status: {
      stageKey: "done",
      publicStage: "done",
    },
    stage_snapshot: {
      stageKey: "render",
      publicStage: "render",
      source: "legacy-stage",
      lane: "main",
      substage: "render_prewarm",
      detail: "render payload prewarm: ready",
      progress: {
        current: 1,
        total: 3,
        percent: 33,
        unit: "step",
      },
    },
  }, { stageAdapterPort: recentJobsStageAdapterPort });

  assert.equal(merged.stage, "translate");
  assert.equal(merged.display_stage, "translation");
  assert.equal(merged.substage, "translation_batches");
  assert.equal(merged.runtime_status.stageKey, "translate");
  assert.equal(merged.runtime_status.publicStage, "translation");
  assert.equal(recentJobStageLabel(merged), "翻译中");
});
