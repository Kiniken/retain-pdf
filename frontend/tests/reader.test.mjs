import test, { before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let readerDataPort;
let readerInteractionFlow;
let readerPdfDocument;
let readerPageConfig;
let readerPageState;
let readerProgressPresenter;
let readerResourceResolver;
let readerRegionInteractions;
let readerAiMarkdown;
let readerAiChat;
let readerAiConfig;
let readerAiRemote;
let readerModeController;
let readerChromeController;
let readerView;
let readerFavoritesStorage;
let readerAiContext;
let readerSideDrawers;
let readerStartup;
let readerViewerMountFlow;
let readerDialogController;
let readerDialogRuntimePort;
let readerDownloadActions;

before(async () => {
  if (typeof Promise.withResolvers !== "function") {
    Promise.withResolvers = function withResolvers() {
      let resolve;
      let reject;
      const promise = new Promise((resolveFn, rejectFn) => {
        resolve = resolveFn;
        reject = rejectFn;
      });
      return { promise, resolve, reject };
    };
  }
  global.window = {
    __FRONT_RUNTIME_CONFIG__: {
      apiBase: "http://retainpdf.local:41000/api/v1",
    },
    location: {
      protocol: "http:",
      hostname: "localhost",
      origin: "http://localhost",
      href: "http://localhost/index.html",
    },
  };
  readerDataPort = await import("../src/js/reader/data-port.js");
  readerInteractionFlow = await import("../src/js/reader/interaction-flow.js");
  readerPdfDocument = await import("../src/js/reader/pdf-document.js");
  readerPageConfig = await import("../src/js/reader/config-port.js");
  readerPageState = await import("../src/js/reader/page-state.js");
  readerProgressPresenter = await import("../src/js/reader/progress-presenter.js");
  readerResourceResolver = await import("../src/js/reader/resource-resolver.js");
  readerRegionInteractions = await import("../src/js/reader/region-interactions.js");
  readerAiMarkdown = await import("../src/js/reader/ai/markdown-answerer.js");
  readerAiChat = await import("../src/js/reader/ai/chat.js");
  readerAiConfig = await import("../src/js/reader/ai/config.js");
  readerAiRemote = await import("../src/js/reader/ai/remote-answerer.js");
  readerModeController = await import("../src/js/reader/mode-controller.js");
  readerChromeController = await import("../src/js/reader/chrome-controller.js");
  readerView = await import("../src/js/reader/view.js");
  readerFavoritesStorage = await import("../src/js/reader/favorites-storage.js");
  readerAiContext = await import("../src/js/reader/ai-context.js");
  readerSideDrawers = await import("../src/js/reader/side-drawers.js");
  readerStartup = await import("../src/js/reader/startup.js");
  readerViewerMountFlow = await import("../src/js/reader/viewer-mount-flow.js");
  readerDialogController = await import("../src/js/features/reader-dialog/controller.js");
  readerDialogRuntimePort = await import("../src/js/bootstrap/reader-dialog-runtime-port.js");
  readerDownloadActions = await import("../src/js/reader/download-actions.js");
});

test("reader artifact url reuses the unified resource resolver", () => {
  assert.equal(
    readerPdfDocument.resolveReaderArtifactUrl({
      resource_path: "/api/v1/jobs/job-1/artifacts/source_pdf",
    }),
    "http://retainpdf.local:41000/api/v1/jobs/job-1/artifacts/source_pdf",
  );
  assert.equal(
    readerPdfDocument.resolveReaderArtifactUrl({
      resource_url: "mock://reader.pdf",
    }),
    "mock://reader.pdf",
  );
});

test("reader resource resolver owns job id source and translated PDF selection", () => {
  assert.equal(
    readerResourceResolver.resolveReaderJobId({ readerJobId: () => "job-reader" }),
    "job-reader",
  );
  const manifest = {
    items: [
      {
        artifact_key: "source_pdf",
        ready: true,
        resource_path: "/api/v1/jobs/job-reader/artifacts/source_pdf",
      },
      {
        artifact_key: "translated_pdf",
        ready: true,
        resource_url: "/api/v1/jobs/job-reader/artifacts/translated_pdf",
      },
    ],
  };

  assert.equal(
    readerResourceResolver.resolveReaderSourcePdf(manifest),
    "http://retainpdf.local:41000/api/v1/jobs/job-reader/artifacts/source_pdf",
  );
  assert.equal(
    readerResourceResolver.resolveReaderTranslatedPdfUrl({}, manifest),
    "http://retainpdf.local:41000/api/v1/jobs/job-reader/artifacts/translated_pdf",
  );
  assert.equal(
    readerResourceResolver.resolveReaderTranslatedPdfUrl({
      output_pdf_ready: true,
      pdf_url: "/api/v1/jobs/job-reader/pdf",
    }, manifest),
    "http://retainpdf.local:41000/api/v1/jobs/job-reader/pdf",
  );
  assert.equal(
    readerResourceResolver.resolveReaderTranslatedPdfUrl({
      job_id: "job-reader",
      output_pdf_ready: true,
    }, { items: [] }),
    "http://retainpdf.local:41000/api/v1/jobs/job-reader/pdf",
  );
  assert.equal(
    readerResourceResolver.resolveReaderTranslatedPdfUrl({
      job_id: "job-reader",
      status: "succeeded",
    }, { items: [] }),
    "http://retainpdf.local:41000/api/v1/jobs/job-reader/pdf",
  );
  assert.equal(
    readerResourceResolver.resolveReaderTranslatedPdfUrl({
      job_id: "job-ocr",
      workflow: "ocr",
      status: "succeeded",
    }, { items: [] }),
    "",
  );
});

test("reader PDF document options use injected config port headers", () => {
  const options = readerPdfDocument.buildPdfDocumentOptions({
    url: "http://retainpdf.local/source.pdf",
    configPort: {
      apiHeaders: () => ({ "X-API-Key": "sk-test" }),
    },
  });

  assert.equal(options.url, "http://retainpdf.local/source.pdf");
  assert.deepEqual(options.httpHeaders, { "X-API-Key": "sk-test" });
  assert.equal(options.disableRange, false);
  assert.equal(options.disableStream, false);
  assert.equal(options.rangeChunkSize, 512 * 1024);
});

test("reader page config resolves query job id before mock fallback", () => {
  assert.equal(
    readerPageConfig.resolveReaderJobId({
      search: "?job_id=job-query",
      isMock: () => true,
      mockJobId: () => "job-mock",
    }),
    "job-query",
  );
  assert.equal(
    readerPageConfig.resolveReaderJobId({
      search: "",
      isMock: () => true,
      mockJobId: () => "job-mock",
    }),
    "job-mock",
  );
  assert.equal(
    readerPageConfig.resolveReaderJobId({
      search: "",
      isMock: () => false,
      mockJobId: () => "job-mock",
    }),
    "",
  );
});

test("reader page config port exposes injectable message origin and job id", () => {
  const port = readerPageConfig.createReaderPageConfigPort({
    messageTargetOrigin: () => "https://reader.host",
    isMock: () => true,
    mockJobId: () => "job-mock",
    search: () => "?job_id=job-real",
  });

  assert.equal(port.messageTargetOrigin(), "https://reader.host");
  assert.equal(port.readerJobId(), "job-real");
});

test("reader mode controller switches tab state and root classes", () => {
  const calls = [];
  function tab(mode) {
    return {
      dataset: { readerMode: mode },
      focused: false,
      classList: { values: new Set(), toggle(name, active) { active ? this.values.add(name) : this.values.delete(name); } },
      setAttribute: (name, value) => calls.push([`${mode}-attr`, name, value]),
      addEventListener(type, handler) { this[type] = handler; calls.push([`${mode}-bind`, type]); },
      focus() { this.focused = true; },
    };
  }
  const buttons = [
    tab("source"),
    tab("translated"),
    tab("compare"),
  ];
  const panels = [
    { dataset: { readerPane: "source" }, hidden: false, inert: false },
    { dataset: { readerPane: "translated" }, hidden: false, inert: false },
  ];
  const root = {
    dataset: {},
    classList: {
      values: new Set(),
      toggle(name, active) {
        active ? this.values.add(name) : this.values.delete(name);
      },
    },
  };
  const controller = readerModeController.createReaderModeController({
    documentRef: {
      querySelectorAll: (selector) => selector === "[data-reader-mode]" ? buttons : panels,
    },
    root,
    onModeChanged: (mode) => calls.push(["mode", mode]),
  });

  controller.bindEvents();
  buttons[0].click();

  assert.equal(controller.currentMode(), "source");
  assert.equal(root.dataset.readerMode, "source");
  assert.equal(root.classList.values.has("reader-mode-source"), true);
  assert.equal(buttons[0].classList.values.has("is-active"), true);
  assert.equal(buttons[1].classList.values.has("is-active"), false);
  assert.equal(panels[0].hidden, false);
  assert.equal(panels[0].inert, false);
  assert.equal(panels[1].hidden, true);
  assert.equal(panels[1].inert, true);
  assert.ok(calls.some((call) => call[0] === "mode" && call[1] === "source"));

  buttons[0].keydown({
    key: "ArrowRight",
    preventDefault: () => calls.push(["prevented"]),
  });
  assert.equal(controller.currentMode(), "translated");
  assert.equal(buttons[1].focused, true);
});

test("reader chrome controller dims idle chrome and wakes on interaction", () => {
  let timerHandler = null;
  const listeners = new Map();
  const root = {
    classList: {
      values: new Set(),
      toggle(name, active) {
        active ? this.values.add(name) : this.values.delete(name);
      },
    },
  };
  function element() {
    const elementListeners = new Map();
    return {
      addEventListener(type, handler) {
        elementListeners.set(type, handler);
      },
      dispatch(type) {
        elementListeners.get(type)?.();
      },
    };
  }
  const scrollShell = element();
  const topbar = element();
  const documentRef = {
    body: root,
    getElementById: (id) => id === "reader-scroll-shell" ? scrollShell : null,
    querySelector: (selector) => selector === ".reader-topbar" ? topbar : null,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
  };
  const controller = readerChromeController.createReaderChromeController({
    documentRef,
    root,
    idleDelay: 10,
    setTimeoutFn: (handler) => {
      timerHandler = handler;
      return 1;
    },
    clearTimeoutFn: () => {
      timerHandler = null;
    },
  });

  controller.bindEvents();
  assert.equal(root.classList.values.has("reader-chrome-muted"), false);
  timerHandler();
  assert.equal(root.classList.values.has("reader-chrome-muted"), true);
  listeners.get("mousemove")();
  assert.equal(root.classList.values.has("reader-chrome-muted"), false);
  topbar.dispatch("mouseenter");
  assert.equal(timerHandler, null);
});

test("reader bottom hud shows page progress and reader mode", () => {
  const previousDocument = global.document;
  const progressStyle = new Map();
  const elements = {
    "reader-page-indicator": {
      classList: { values: new Set(["hidden"]), add(name) { this.values.add(name); }, remove(name) { this.values.delete(name); } },
      dataset: {},
      attributes: new Map(),
      setAttribute(name, value) { this.attributes.set(name, value); },
    },
    "reader-bottom-hud-page": { textContent: "" },
    "reader-bottom-hud-progress-bar": {
      style: { setProperty: (name, value) => progressStyle.set(name, value) },
    },
    "reader-bottom-hud-mode": { textContent: "" },
  };
  global.document = {
    getElementById: (id) => elements[id] || null,
  };

  readerView.setPageIndicator(2, 5);
  readerView.setReaderModeHud("translated");

  assert.equal(elements["reader-page-indicator"].classList.values.has("hidden"), false);
  assert.equal(elements["reader-bottom-hud-page"].textContent, "第 2 / 5 页");
  assert.equal(elements["reader-page-indicator"].dataset.readerProgress, "40");
  assert.equal(elements["reader-page-indicator"].attributes.get("aria-label"), "第 2 / 5 页 · 40%");
  assert.equal(progressStyle.get("--reader-progress"), "40%");
  assert.equal(elements["reader-bottom-hud-mode"].textContent, "译文");

  global.document = previousDocument;
});

test("reader favorites store persists per job", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || "",
    setItem: (key, value) => values.set(key, value),
  };
  const store = readerFavoritesStorage.createReaderFavoritesStore({
    jobId: "job-reader",
    storage,
  });

  const next = store.add({
    id: "fav-1",
    kind: "area",
    page: 3,
    rect: { left: 1, top: 2, width: 30, height: 40 },
  });

  assert.equal(store.storageKey, "retainpdf.reader.favorites.job-reader");
  assert.equal(next.length, 1);
  assert.deepEqual(store.list()[0], {
    id: "fav-1",
    kind: "area",
    page: 3,
    rect: { left: 1, top: 2, width: 30, height: 40 },
  });
});

test("reader favorites can reopen a saved area selection", async () => {
  const children = [];
  const pageChildren = [];
  const bodyChildren = [];
  const modeCalls = [];
  let favoriteClick = null;
  let favoriteDblclick = null;
  let favoriteLocateClick = null;
  let favoriteLocateMouseleave = null;
  let favoriteLocatePointerdown = null;
  let favoriteLocatePointerup = null;
  let favoriteRemoveClick = null;
  let favoriteRemoveElement = null;
  let conclusionTagClick = null;
  let conclusionTagElement = null;
  let keyTagClick = null;
  const pageElement = {
    appendChild(child) {
      pageChildren.push(child);
      child.parentNode = this;
      return child;
    },
    getBoundingClientRect: () => ({ left: 20, top: 330, width: 600, height: 900 }),
    closest: (selector) => selector === "[data-reader-pane]" ? { dataset: { readerPane: "translated" } } : null,
    ownerDocument: null,
    querySelectorAll: () => [],
    scrollCalls: [],
    scrollIntoView(options) {
      this.scrollCalls.push(options);
    },
  };
  const documentRef = {
    body: {
      dataset: { readerMode: "compare" },
      appendChild(child) {
        bodyChildren.push(child);
        child.parentNode = this;
        return child;
      },
    },
    createElement(tagName) {
      const element = {
        tagName,
        children: [],
        className: "",
        dataset: {},
        style: {},
        textContent: "",
        type: "",
        parentNode: null,
        classList: {
          values: new Set(),
          add(...names) { names.forEach((name) => this.values.add(name)); },
          toggle(name, active) { active ? this.values.add(name) : this.values.delete(name); },
        },
        addEventListener(type, handler) {
          if (tagName === "button" && this.className === "reader-favorite-card" && type === "click") {
            favoriteClick = handler;
          }
          if (tagName === "button" && this.className === "reader-favorite-card" && type === "dblclick") {
            favoriteDblclick = handler;
          }
          if (tagName === "span" && this.className === "reader-favorite-locate" && type === "click") {
            favoriteLocateClick = handler;
          }
          if (tagName === "span" && this.className === "reader-favorite-locate" && type === "mouseleave") {
            favoriteLocateMouseleave = handler;
          }
          if (tagName === "span" && this.className === "reader-favorite-locate" && type === "pointerdown") {
            favoriteLocatePointerdown = handler;
          }
          if (tagName === "span" && this.className === "reader-favorite-locate" && type === "pointerup") {
            favoriteLocatePointerup = handler;
          }
          if (tagName === "span" && this.className === "reader-favorite-remove" && type === "click") {
            favoriteRemoveClick = handler;
            favoriteRemoveElement = this;
          }
          if (tagName === "span" && this.dataset.readerTag === "conclusion" && type === "click") {
            conclusionTagClick = handler;
            conclusionTagElement = this;
          }
          if (tagName === "span" && this.dataset.readerTag === "key" && type === "click") {
            keyTagClick = handler;
          }
          this[type] = handler;
        },
        setAttribute(name, value) {
          this[name] = value;
        },
        append(...nodes) {
          nodes.forEach((child) => {
            this.children.push(child);
            child.parentNode = this;
          });
        },
        appendChild(child) {
          this.children.push(child);
          child.parentNode = this;
          return child;
        },
        replaceChildren(...nodes) {
          this.children = [...nodes];
        },
        remove() {
          this.removed = true;
        },
        focus() {
          this.focused = true;
        },
        querySelector(selector) {
          return this.children.find((child) => child.className === selector.replace(".", "")) || null;
        },
        querySelectorAll(selector) {
          return this.children.filter((child) => child.className === selector.replace(".", ""));
        },
      };
      element.ownerDocument = documentRef;
      return element;
    },
    getElementById(id) {
      if (id === "reader-favorites-list") {
        return listEl;
      }
      return null;
    },
  };
  const listEl = {
    ownerDocument: documentRef,
    scrollLeft: 0,
    scrollTop: 0,
    appendChild(child) {
      children.push(child);
      child.parentNode = this;
      return child;
    },
    replaceChildren() {
      children.length = 0;
    },
  };
  const root = {
    clientHeight: 600,
    clientWidth: 800,
    scrollLeft: 7,
    scrollHeight: 2400,
    scrollWidth: 1200,
    scrollTop: 1000,
    appendChild() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    querySelector: (selector) => [
      '.page[data-page-number="2"]',
      '[data-reader-pane="translated"] .page[data-page-number="2"]',
    ].includes(selector) ? pageElement : null,
    scrollTo(options) {
      this.scrollLeft = options.left;
      this.scrollTop = options.top;
      this.scrollOptions = options;
    },
  };
  pageElement.ownerDocument = documentRef;
  let storedFavorites = [{
    id: "fav-1",
    kind: "area",
    page: 2,
    pane: "translated",
    rect: { left: 10, top: 12, width: 80, height: 30 },
    mode: "compare",
    tag: "conclusion",
    title: "截图摘录",
    note: "第 2 页，选区 10, 12, 80, 30",
  }];
  const store = {
    list: () => storedFavorites,
    add: () => [],
    save(items) {
      storedFavorites = items;
    },
  };
  const previousWindow = global.window;
  const confirmCalls = [];
  global.window = {
    confirm(message) {
      confirmCalls.push(message);
      return confirmCalls.length > 1;
    },
    setTimeout(callback) {
      callback();
      return 1;
    },
  };
  const controller = (await import("../src/js/reader/selection-favorites.js")).createReaderSelectionFavorites({
    documentRef,
    root,
    setReaderMode: (mode) => {
      modeCalls.push(mode);
      documentRef.body.dataset.readerMode = mode;
    },
    store,
  });

  controller.syncDrawer();
  assert.equal(children.length, 1);
  assert.equal(children[0].tagName, "button");
  assert.equal(children[0].children.some((child) => child.className === "reader-favorite-thumb"), true);
  assert.equal(children[0].children.some((child) => child.className === "reader-favorite-editor"), true);
  assert.equal(bodyChildren.some((child) => child.id === "reader-favorite-popover"), false);
  assert.equal(conclusionTagElement.dataset.active, "true");
  conclusionTagClick({
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(storedFavorites[0].tag, "");
  listEl.scrollTop = 128;
  keyTagClick({
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(storedFavorites[0].tag, "key");
  assert.equal(listEl.scrollTop, 128);

  favoriteClick();

  assert.deepEqual(modeCalls, []);
  assert.equal(pageElement.scrollCalls.length, 0);
  assert.equal(bodyChildren.filter((child) => child.className === "reader-selection-box").length, 1);
  assert.equal(pageChildren.some((child) => child.className === "reader-selection-locator"), false);

  favoriteLocateClick({
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(pageElement.scrollCalls.length, 0);
  assert.equal(root.scrollTop, 1057);
  assert.equal(root.scrollLeft, 0);
  assert.deepEqual(root.scrollOptions, { left: 0, top: 1057, behavior: "auto" });
  assert.equal(pageChildren.some((child) => child.className === "reader-selection-locator"), true);

  favoriteDblclick({
    preventDefault() {},
  });
  assert.equal(bodyChildren.filter((child) => child.className === "reader-selection-box").length, 1);
  favoriteLocateClick({
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(bodyChildren.filter((child) => child.className === "reader-selection-box").length, 1);
  assert.equal(pageElement.scrollCalls.length, 0);
  assert.equal(pageChildren.some((child) => child.className === "reader-selection-locator"), true);
  root.scrollTop = 1000;
  root.scrollLeft = 7;
  favoriteLocatePointerdown({
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(pageElement.scrollCalls.length, 0);
  root.scrollTop = 420;
  root.scrollLeft = 3;
  favoriteLocateMouseleave({
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(root.scrollTop, 1000);
  assert.equal(root.scrollLeft, 7);
  assert.deepEqual(root.scrollOptions, { left: 7, top: 1000, behavior: "auto" });
  favoriteLocatePointerdown({
    preventDefault() {},
    stopPropagation() {},
  });
  favoriteLocatePointerup({
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(root.scrollTop, 1000);
  const restoredOverlay = bodyChildren.find((child) => child.className === "reader-selection-box");
  listEl.scrollTop = 144;
  let removeStopped = false;
  favoriteRemoveClick({
    preventDefault() {},
    stopPropagation() {
      removeStopped = true;
    },
  });
  assert.equal(removeStopped, true);
  assert.equal(confirmCalls.length, 0);
  const deletePopover = children[0].children.find((child) => child.className === "reader-delete-popover");
  assert.ok(deletePopover);
  assert.equal(favoriteRemoveElement.textContent, "×");
  assert.equal(storedFavorites.length, 1);
  assert.equal(restoredOverlay.removed, undefined);
  deletePopover.children.find((child) => child.className === "reader-delete-popover-confirm").click({
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(confirmCalls.length, 0);
  assert.deepEqual(storedFavorites, []);
  assert.equal(restoredOverlay.removed, true);
  assert.equal(listEl.scrollTop, 144);
  global.window = previousWindow;
});

test("reader left drag clipping can be collected into the side drawer", async () => {
  const listeners = {};
  const pageChildren = [];
  const bodyChildren = [];
  const addedItems = [];
  const drawerCalls = [];
  const drawImageCalls = [];
  const canvas = {
    width: 400,
    height: 600,
    clientWidth: 200,
    clientHeight: 300,
    getBoundingClientRect: () => ({ left: 15, top: 30, width: 200, height: 300 }),
    getContext: () => ({}),
  };
  const paneElement = { dataset: { readerPane: "translated" } };
  let overlayLocateClick = null;
  let overlayLocatePointerdown = null;
  let overlayLocatePointerup = null;
  const pageElement = {
    appendChild(child) {
      pageChildren.push(child);
      child.parentNode = this;
      return child;
    },
    contains: () => true,
    closest: (selector) => selector === "[data-reader-pane]" ? paneElement : null,
    getAttribute: (name) => name === "data-page-number" ? "4" : "",
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 300 }),
    ownerDocument: null,
    querySelector: (selector) => selector === "canvas" ? canvas : null,
    querySelectorAll: () => [],
    scrollCalls: [],
    scrollIntoView(options) {
      this.scrollCalls.push(options);
    },
  };
  const previousWindow = global.window;
  const confirmCalls = [];
  global.window = {
    ...previousWindow,
    confirm(message) {
      confirmCalls.push(message);
      return confirmCalls.length > 1;
    },
    innerWidth: 1000,
    innerHeight: 800,
    setTimeout(callback) {
      callback();
      return 1;
    },
  };
  const documentRef = {
    body: {
      dataset: { readerMode: "translated" },
      appendChild(child) {
        bodyChildren.push(child);
        child.parentNode = this;
        return child;
      },
    },
    createElement(tagName) {
      if (tagName === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage(...args) {
              drawImageCalls.push(args);
            },
          }),
          toDataURL: () => "data:image/png;base64,preview",
          ownerDocument: documentRef,
        };
      }
      const element = {
        tagName,
        children: [],
        className: "",
        dataset: {},
        style: {},
        textContent: "",
        type: "",
        parentNode: null,
        classList: {
          values: new Set(),
          add(...names) { names.forEach((name) => this.values.add(name)); },
          toggle(name, active) { active ? this.values.add(name) : this.values.delete(name); },
        },
        addEventListener(type, handler) {
          if (this.className === "reader-selection-locate" && type === "click") {
            overlayLocateClick = handler;
          }
          if (this.className === "reader-selection-locate" && type === "pointerdown") {
            overlayLocatePointerdown = handler;
          }
          if (this.className === "reader-selection-locate" && type === "pointerup") {
            overlayLocatePointerup = handler;
          }
          this[type] = handler;
        },
        closest(selector) {
          if (selector === ".reader-selection-box" && this.className === "reader-selection-box") {
            return this;
          }
          return null;
        },
        setAttribute(name, value) {
          this[name] = value;
        },
        append(...nodes) {
          nodes.forEach((child) => {
            this.children.push(child);
            child.parentNode = this;
          });
        },
        appendChild(child) {
          this.children.push(child);
          child.parentNode = this;
          return child;
        },
        replaceChildren(...nodes) {
          this.children = [...nodes];
        },
        remove() {
          this.removed = true;
        },
        focus() {
          this.focused = true;
        },
        querySelector(selector) {
          return this.children.find((child) => child.className === selector.replace(".", "")) || null;
        },
        querySelectorAll(selector) {
          return this.children.filter((child) => child.className === selector.replace(".", ""));
        },
      };
      element.ownerDocument = documentRef;
      return element;
    },
    getElementById: () => listEl,
  };
  const listEl = {
    ownerDocument: documentRef,
    appendChild() {},
    replaceChildren() {},
  };
  const root = {
    clientHeight: 500,
    clientWidth: 400,
    scrollHeight: 1200,
    scrollLeft: 0,
    scrollTop: 0,
    scrollWidth: 900,
    appendChild() {},
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    contains: (element) => element === pageElement,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 500 }),
  };
  let storedItems = [];
  const store = {
    list: () => storedItems,
    add(item) {
      addedItems.push(item);
      storedItems = [item, ...storedItems];
      return storedItems;
    },
    save(items) {
      storedItems = items;
    },
  };
  pageElement.ownerDocument = documentRef;
  const controller = (await import("../src/js/reader/selection-favorites.js")).createReaderSelectionFavorites({
    documentRef,
    drawerController: { open: (name) => drawerCalls.push(name) },
    root,
    store,
  });
  controller.bindEvents();

  const target = {
    closest: (selector) => selector === ".page[data-page-number]" ? pageElement : null,
  };
  listeners.mousedown({
    button: 0,
    clientX: 30,
    clientY: 50,
    target,
    preventDefault() {},
  });
  listeners.mousemove({
    clientX: 90,
    clientY: 110,
    preventDefault() {},
  });
  listeners.mouseup({
    preventDefault() {},
  });
  const overlay = bodyChildren.find((child) => child.className === "reader-selection-box");

  assert.equal(addedItems.length, 1);
  assert.equal(addedItems[0].kind, "clipping");
  assert.equal(addedItems[0].page, 4);
  assert.equal(addedItems[0].mode, "translated");
  assert.equal(addedItems[0].pane, "translated");
  assert.deepEqual(addedItems[0].relativeRect, {
    x: 0.1,
    y: 0.1,
    width: 0.3,
    height: 0.2,
  });
  assert.deepEqual(addedItems[0].anchorRect, {
    left: 30,
    top: 50,
    width: 60,
    height: 60,
  });
  assert.equal(addedItems[0].previewUrl, "data:image/png;base64,preview");
  assert.deepEqual(drawImageCalls[0].slice(1, 5), [30, 40, 120, 120]);
  assert.deepEqual(drawerCalls, []);
  assert.equal(overlay.children.some((child) => child.className === "reader-selection-close"), true);
  assert.equal(overlay.children.some((child) => child.className === "reader-selection-collect"), true);
  assert.equal(overlay.children.some((child) => child.className === "reader-selection-locate"), true);
  const locate = overlay.children.find((child) => child.className === "reader-selection-locate");
  overlayLocateClick({
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(pageElement.scrollCalls.length, 0);
  assert.equal(root.scrollTop, 0);
  assert.equal(root.scrollLeft, 0);
  assert.equal(pageChildren.some((child) => child.className === "reader-selection-locator"), true);
  root.scrollTop = 210;
  root.scrollLeft = 12;
  overlayLocatePointerdown({
    preventDefault() {},
    stopPropagation() {},
  });
  root.scrollTop = 30;
  root.scrollLeft = 1;
  overlayLocatePointerup({
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(root.scrollTop, 210);
  assert.equal(root.scrollLeft, 12);

  overlay.mousedown({
    button: 0,
    clientX: 40,
    clientY: 60,
    target: overlay,
    preventDefault() {},
    stopPropagation() {},
  });
  listeners.mousemove({
    clientX: 980,
    clientY: 780,
    preventDefault() {},
  });
  listeners.mouseup({
    preventDefault() {},
  });
  assert.deepEqual(storedItems[0].relativeRect, {
    x: 0.1,
    y: 0.1,
    width: 0.3,
    height: 0.2,
  });
  assert.deepEqual(storedItems[0].anchorRelativeRect, {
    x: 0.94,
    y: 0.925,
    width: 0.06,
    height: 0.075,
  });
  assert.equal(pageChildren.some((child) => child.className === "reader-selection-toolbar"), false);

  overlay.wheel({
    deltaY: -1,
    clientX: 960,
    clientY: 760,
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(storedItems[0].scale, 1.08);
  assert.equal(Number(storedItems[0].anchorRect.width.toFixed(3)), 64.8);
  assert.equal(Number(storedItems[0].anchorRect.height.toFixed(3)), 64.8);

  for (let index = 0; index < 40; index += 1) {
    overlay.wheel({
      deltaY: -1,
      clientX: 960,
      clientY: 760,
      preventDefault() {},
      stopPropagation() {},
    });
  }
  assert.equal(storedItems[0].scale, 3);
  assert.equal(storedItems[0].anchorRect.width, 180);

  for (let index = 0; index < 80; index += 1) {
    overlay.wheel({
      deltaY: 1,
      clientX: 960,
      clientY: 760,
      preventDefault() {},
      stopPropagation() {},
    });
  }
  assert.equal(storedItems[0].scale, 1 / 3);
  assert.equal(storedItems[0].anchorRect.width, 20);

  const close = overlay.children.find((child) => child.className === "reader-selection-close");
  close.click({
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(confirmCalls.length, 0);
  const overlayDeletePopover = overlay.children.find((child) => child.className === "reader-delete-popover");
  assert.ok(overlayDeletePopover);
  assert.equal(close.textContent, "×");
  assert.equal(overlay.removed, undefined);
  assert.equal(storedItems.length, 1);
  overlayDeletePopover.children.find((child) => child.className === "reader-delete-popover-confirm").click({
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(confirmCalls.length, 0);
  assert.equal(overlay.removed, true);
  assert.deepEqual(storedItems, []);

  listeners.mousedown({
    button: 0,
    clientX: 40,
    clientY: 60,
    target,
    preventDefault() {},
  });
  listeners.mousemove({
    clientX: 80,
    clientY: 90,
    preventDefault() {},
  });
  listeners.mouseup({
    preventDefault() {},
  });
  const secondOverlay = bodyChildren.filter((child) => child.className === "reader-selection-box").at(-1);
  secondOverlay.dblclick({
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(secondOverlay.removed, true);
  assert.equal(storedItems.length, 1);
  assert.deepEqual(drawerCalls, ["favorites"]);
  global.window = previousWindow;
});

test("reader translated region right click keeps selection drag from stealing the event", () => {
  const previousWindow = global.window;
  global.window = {
    ...previousWindow,
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
  };
  const listeners = {};
  const canvas = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }),
  };
  const pageElement = {
    getAttribute: (name) => name === "data-page-number" ? "1" : "",
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }),
    querySelector: (selector) => selector === "canvas" ? canvas : null,
  };
  const viewerElement = {
    dataset: {},
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    contains: (element) => element === pageElement,
  };
  const event = {
    button: 2,
    clientX: 70,
    clientY: 70,
    target: {
      closest: (selector) => selector === ".page[data-page-number]" ? pageElement : null,
    },
    stopped: false,
    stopPropagation() {
      this.stopped = true;
    },
  };

  readerRegionInteractions.bindReaderRegionHover({
    regions: [{
      item_id: "region-1",
      source: { page: 1, bbox: [10, 10, 60, 60] },
      translated: { page: 1, bbox: [50, 50, 90, 90] },
    }],
    sourceController: {
      viewerElement: { querySelector: () => null },
      pageViewports: new Map([[1, { width: 200, height: 200 }]]),
    },
    translatedController: {
      viewerElement,
      pageViewports: new Map([[1, { width: 200, height: 200 }]]),
    },
  });

  assert.equal(readerRegionInteractions.isReaderTranslatedRegionEvent(event), true);
  listeners.mousedown(event);
  assert.equal(event.stopped, true);
  global.window = previousWindow;
});

test("reader page keeps ai entry hidden while reader ai is paused", () => {
  const markup = readFileSync(new URL("../reader.html", import.meta.url), "utf8");

  assert.match(markup, /id="reader-favorites-drawer" class="reader-side-drawer reader-favorites-drawer"/);
  assert.doesNotMatch(markup, /class="reader-tool-dock"/);
  assert.doesNotMatch(markup, /id="reader-selection-mode-btn"/);
  assert.doesNotMatch(markup, /id="reader-favorites-toggle-btn"/);
  assert.doesNotMatch(markup, /class="reader-download-menu"/);
  assert.doesNotMatch(markup, /id="reader-download-source-btn"/);
  assert.doesNotMatch(markup, /id="reader-download-sideBySide-btn"/);
  assert.doesNotMatch(markup, /id="reader-download-translated-btn"/);
  assert.doesNotMatch(markup, /id="reader-ai-toggle-btn"/);
  assert.doesNotMatch(markup, /id="reader-ai-drawer"/);
  assert.doesNotMatch(markup, /data-reader-ai-composer/);
});

test("reader download actions resolve artifact urls and disabled reasons", () => {
  const manifest = {
    items: [
      {
        artifact_key: "source_pdf",
        ready: true,
        resource_path: "/api/v1/jobs/job-reader/artifacts/source_pdf",
      },
      {
        artifact_key: "pdf",
        ready: true,
        resource_path: "/api/v1/jobs/job-reader/artifacts/pdf",
      },
    ],
  };
  const urls = readerDownloadActions.resolveReaderDownloadUrls({
    jobId: "job-reader",
    jobPayload: { job_id: "job-reader", output_pdf_ready: true },
    manifestPayload: manifest,
  });

  assert.equal(urls.source, "http://retainpdf.local:41000/api/v1/jobs/job-reader/artifacts/source_pdf");
  assert.equal(urls.translated, "http://retainpdf.local:41000/api/v1/jobs/job-reader/artifacts/pdf");
  assert.equal(urls.sideBySide, "http://retainpdf.local:41000/api/v1/jobs/job-reader/pdf/side-by-side");

  const buttons = new Map([
    ["reader-download-source-btn", { dataset: {}, disabled: false, attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } }],
    ["reader-download-sideBySide-btn", { dataset: {}, disabled: false, attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } }],
    ["reader-download-translated-btn", { dataset: {}, disabled: false, attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } }],
  ]);
  const menu = { open: true };
  const controller = readerDownloadActions.createReaderDownloadActions({
    documentRef: {
      getElementById: (id) => buttons.get(id) || null,
      querySelector: (selector) => selector === ".reader-download-menu" ? menu : null,
    },
    fetchProtected: async () => ({ ok: true }),
  });
  controller.sync({
    jobId: "job-reader",
    jobPayload: { job_id: "job-reader", workflow: "ocr", status: "succeeded" },
    manifestPayload: { items: [] },
  });

  assert.equal(buttons.get("reader-download-source-btn").disabled, true);
  assert.equal(buttons.get("reader-download-source-btn").attrs["aria-disabled"], "true");
  assert.match(buttons.get("reader-download-source-btn").title, /原始 PDF/);
  assert.equal(buttons.get("reader-download-translated-btn").disabled, true);
  assert.match(buttons.get("reader-download-translated-btn").title, /译文 PDF/);
  assert.equal(buttons.get("reader-download-sideBySide-btn").disabled, true);
  assert.match(buttons.get("reader-download-sideBySide-btn").title, /PDF/);

  controller.sync({
    jobId: "",
    jobPayload: null,
    manifestPayload: { items: [] },
  });
  assert.equal(buttons.get("reader-download-source-btn").disabled, true);
  assert.equal(buttons.get("reader-download-source-btn").attrs["aria-disabled"], "true");
  assert.match(buttons.get("reader-download-source-btn").title, /原始 PDF/);
});

test("reader side drawer controls favorites", () => {
  const activeChanges = [];
  function element() {
    return {
      attrs: {},
      inert: false,
      classList: {
        values: new Set(),
        toggle(name, active) {
          active ? this.values.add(name) : this.values.delete(name);
        },
      },
      addEventListener(type, handler) {
        this[type] = handler;
      },
      setAttribute(name, value) {
        this.attrs[name] = value;
      },
    };
  }
  const elements = {
    "reader-favorites-drawer": element(),
    "reader-favorites-close-btn": element(),
  };
  const controller = readerSideDrawers.createReaderSideDrawers({
    documentRef: {
      getElementById: (id) => elements[id] || null,
    },
    onActiveChanged: (active) => activeChanges.push(active),
  });

  controller.bindEvents();
  assert.equal(elements["reader-favorites-drawer"].inert, false);

  controller.open("favorites");
  assert.equal(controller.active(), "favorites");
  assert.equal(elements["reader-favorites-drawer"].classList.values.has("is-open"), true);
  assert.equal(elements["reader-favorites-drawer"].inert, false);
  assert.deepEqual(activeChanges, ["", "favorites"]);
});

test("reader ai context can switch to selection scope", () => {
  const calls = [];
  const contextEl = { textContent: "" };
  const buttons = [
    {
      dataset: { readerAiScope: "document" },
      classList: { values: new Set(), toggle(name, active) { active ? this.values.add(name) : this.values.delete(name); } },
      setAttribute: (name, value) => calls.push(["document-attr", name, value]),
      addEventListener(type, handler) { this[type] = handler; },
    },
    {
      dataset: { readerAiScope: "selection" },
      classList: { values: new Set(), toggle(name, active) { active ? this.values.add(name) : this.values.delete(name); } },
      setAttribute: (name, value) => calls.push(["selection-attr", name, value]),
      addEventListener(type, handler) { this[type] = handler; },
    },
  ];
  const opened = [];
  const context = readerAiContext.createReaderAiContext({
    documentRef: {
      getElementById: (id) => id === "reader-ai-context" ? contextEl : null,
      querySelectorAll: () => buttons,
    },
    drawerController: {
      open: (name) => opened.push(name),
    },
  });

  context.bindEvents();
  context.useSelection({
    page: 4,
    rect: { width: 120, height: 64 },
  });

  assert.equal(context.scope(), "selection");
  assert.equal(contextEl.textContent, "当前选区：第 4 页 · 120 × 64");
  assert.equal(buttons[1].classList.values.has("is-active"), true);
  assert.deepEqual(opened, ["ai"]);
});

test("reader markdown answerer answers from markdown sections", async () => {
  const answerer = readerAiMarkdown.createReaderMarkdownAnswerer({
    loadMarkdownPayload: async () => ({
      content: [
        "# Paper",
        "This paper studies retained translation quality.",
        "## Formula",
        "The energy equation is E = mc^2 and appears near page 3.",
        "## Conclusion",
        "The method improves bilingual PDF reading.",
      ].join("\n"),
    }),
  });

  const result = await answerer.answer({
    jobId: "job-ai",
    question: "energy equation",
  });

  assert.match(result.answer, /Formula/);
  assert.match(result.answer, /E = mc\^2/);
  assert.deepEqual(result.citations.includes("Formula"), true);
});

test("reader ai chat submits a markdown grounded answer", async () => {
  const appended = [];
  const threadEl = {
    ownerDocument: null,
    appendChild(child) {
      appended.push(child);
      return child;
    },
    scrollHeight: 120,
    scrollTop: 0,
  };
  const inputEl = { disabled: false, value: "What is RetainPDF?" };
  const submitEl = { disabled: false, textContent: "" };
  const statusEl = { textContent: "" };
  const formEl = { addEventListener() {} };
  const documentRef = {
    createElement(tagName) {
      return {
        tagName,
        children: [],
        className: "",
        textContent: "",
        append(...nodes) {
          this.children.push(...nodes);
        },
      };
    },
    getElementById(id) {
      return {
        "reader-ai-input": inputEl,
        "reader-ai-submit-btn": submitEl,
        "reader-ai-status": statusEl,
        "reader-ai-thread": threadEl,
      }[id] || null;
    },
    querySelector(selector) {
      return selector === "[data-reader-ai-composer]" ? formEl : null;
    },
  };
  threadEl.ownerDocument = documentRef;
  const chat = readerAiChat.createReaderAiChat({
    documentRef,
    jobId: "job-ai",
    aiContext: {
      context: () => ({ page: 2 }),
      scope: () => "page",
    },
    answerer: {
      answer: async () => ({ answer: "RetainPDF answer", citations: [], scope: "page" }),
      ensureLoaded: async () => "markdown",
    },
  });

  const result = await chat.submit();

  assert.equal(result.answer, "RetainPDF answer");
  assert.equal(inputEl.value, "");
  assert.equal(statusEl.textContent, "后端阅读问答已完成");
  assert.equal(appended.length, 2);
  assert.equal(appended[0].children[1].textContent, "What is RetainPDF?");
  assert.equal(appended[1].children[1].textContent, "RetainPDF answer");
});

test("reader remote ai answerer posts backend chat payload", async () => {
  const calls = [];
  const answerer = readerAiRemote.createReaderRemoteAnswerer({
    apiKey: "sk-reader",
    baseUrl: "https://api.deepseek.com/v1",
    jobId: "job-ai",
    model: "deepseek-chat",
    provider: "deepseek",
    submitAiChat: async (jobId, payload) => {
      calls.push([jobId, payload]);
      return {
        answer: "Backend answer",
        citations: [{ title: "Intro", page: 1, snippet: "snippet" }],
        used_context: { source: "markdown", scope: "selection" },
      };
    },
  });

  const result = await answerer.answer({
    context: {
      mode: "compare",
      page: 4,
      rect: { left: 1, top: 2, width: 30, height: 40 },
    },
    history: [{ role: "user", content: "before" }],
    question: "Explain",
    scope: "selection",
  });

  assert.equal(result.answer, "Backend answer");
  assert.deepEqual(calls, [[
    "job-ai",
    {
      message: "Explain",
      scope: "selection",
      provider: "deepseek",
      model: "deepseek-chat",
      api_key: "sk-reader",
      base_url: "https://api.deepseek.com/v1",
      context: {
        page: 4,
        selection: {
          page: 4,
          rect: { left: 1, top: 2, width: 30, height: 40 },
        },
        mode: "compare",
      },
      history: [{ role: "user", content: "before" }],
    },
  ]]);
});

test("reader ai config prefers persisted browser credentials", () => {
  const config = readerAiConfig.resolveReaderAiConfig({
    browserConfig: { modelApiKey: "sk-local" },
    developerConfig: {
      baseUrl: "https://reader.local/v1",
      model: "deepseek-chat",
    },
  });

  assert.deepEqual(config, {
    apiKey: "sk-local",
    baseUrl: "https://reader.local/v1",
    model: "deepseek-chat",
    provider: "deepseek",
  });
});

test("reader ai chat falls back to markdown answerer when backend chat fails", async () => {
  const appended = [];
  const threadEl = {
    ownerDocument: null,
    appendChild(child) {
      appended.push(child);
      return child;
    },
    scrollHeight: 120,
    scrollTop: 0,
  };
  const inputEl = { disabled: false, value: "Explain fallback" };
  const submitEl = { disabled: false, textContent: "" };
  const statusEl = { textContent: "" };
  const documentRef = {
    createElement(tagName) {
      return {
        tagName,
        children: [],
        className: "",
        textContent: "",
        append(...nodes) {
          this.children.push(...nodes);
        },
      };
    },
    getElementById(id) {
      return {
        "reader-ai-input": inputEl,
        "reader-ai-submit-btn": submitEl,
        "reader-ai-status": statusEl,
        "reader-ai-thread": threadEl,
      }[id] || null;
    },
    querySelector: () => null,
  };
  threadEl.ownerDocument = documentRef;
  const chat = readerAiChat.createReaderAiChat({
    documentRef,
    fallbackAnswerer: {
      answer: async () => ({
        answer: "Local fallback",
        citations: [{ title: "Fallback", page: 2, snippet: "local snippet" }],
      }),
      ensureLoaded: async () => true,
    },
    remoteAnswerer: {
      answer: async () => {
        throw new Error("502 provider failed");
      },
      ensureLoaded: async () => true,
    },
  });

  await chat.submit();

  assert.equal(statusEl.textContent, "已回退到 Markdown 本地检索");
  assert.match(appended[1].children[1].textContent, /Local fallback/);
  assert.match(appended[1].children[1].textContent, /引用/);
  assert.match(appended[1].children[1].textContent, /502 provider failed/);
});

test("reader data port owns page API orchestration and fallbacks", async () => {
  const calls = [];
  const port = readerDataPort.createReaderDataPort({
    apiPrefix: "/reader-api",
    loadJob: async (jobId, apiPrefix) => {
      calls.push(["job", jobId, apiPrefix]);
      return { job_id: jobId };
    },
    loadManifest: async (jobId, apiPrefix) => {
      calls.push(["manifest", jobId, apiPrefix]);
      return { items: [] };
    },
    loadMarkdown: async (jobId, apiPrefix) => {
      calls.push(["markdown", jobId, apiPrefix]);
      return { content: "# ok" };
    },
    loadAiChat: async (jobId, payload, apiPrefix) => {
      calls.push(["ai-chat", jobId, payload.message, apiPrefix]);
      return { answer: "ok" };
    },
    loadRegions: async (jobId, apiPrefix) => {
      calls.push(["regions", jobId, apiPrefix]);
      throw new Error("regions unavailable");
    },
    loadMetadata: async (jobId, apiPrefix) => {
      calls.push(["metadata", jobId, apiPrefix]);
      throw new Error("metadata unavailable");
    },
    loadTranslationItem: async (jobId, itemId, apiPrefix) => {
      calls.push(["translation", jobId, itemId, apiPrefix]);
      return { item_id: itemId };
    },
    fetchProtectedResource: async (url) => ({ url }),
  });

  const payload = await port.loadReaderPayload("job-reader");
  assert.deepEqual(payload, {
    jobPayload: { job_id: "job-reader" },
    manifestPayload: { items: [] },
    readerMetadata: null,
    regionsPayload: { items: [] },
  });
  assert.deepEqual(await port.fetchRegionTranslationItem("job-reader", "item-1"), {
    item_id: "item-1",
  });
  assert.deepEqual(await port.fetchProtected("http://asset.test/file.pdf"), {
    url: "http://asset.test/file.pdf",
  });
  assert.deepEqual(await port.loadMarkdownPayload("job-reader"), {
    content: "# ok",
  });
  assert.deepEqual(await port.submitAiChat("job-reader", { message: "hi" }), {
    answer: "ok",
  });
  assert.deepEqual(calls, [
    ["job", "job-reader", "/reader-api"],
    ["manifest", "job-reader", "/reader-api"],
    ["regions", "job-reader", "/reader-api"],
    ["metadata", "job-reader", "/reader-api"],
    ["translation", "job-reader", "item-1", "/reader-api"],
    ["markdown", "job-reader", "/reader-api"],
    ["ai-chat", "job-reader", "hi", "/reader-api"],
  ]);
});

test("reader startup uses page runtime instead of naked initialization", async () => {
  const calls = [];
  const pageRuntime = {
    start(initializer) {
      calls.push(["start"]);
      return initializer();
    },
  };
  const startReader = readerStartup.createReaderInitializer({
    initializeReader: async () => {
      calls.push(["initialize-reader"]);
    },
    pageRuntime,
  });

  assert.equal(startReader(), pageRuntime);
  assert.deepEqual(calls, [
    ["start"],
    ["initialize-reader"],
  ]);
});

test("reader page state owns boot progress snapshots", () => {
  const state = readerPageState.createReaderPageState();

  assert.deepEqual(readerPageState.computeReaderProgressSnapshot(state.progress), {
    percent: 8,
    text: "正在准备对照阅读…",
    stage: "boot",
  });

  state.progress.metadataReady = true;
  assert.deepEqual(readerPageState.computeReaderProgressSnapshot(state.progress), {
    percent: 24,
    text: "正在加载原始 PDF 和译文 PDF…",
    stage: "pdfs",
  });

  state.progress.sourceDone = true;
  assert.deepEqual(readerPageState.computeReaderProgressSnapshot(state.progress), {
    percent: 54,
    text: "原始 PDF 已加载，正在加载译文 PDF…",
    stage: "pdfs",
  });

  state.progress.translatedDone = true;
  assert.deepEqual(readerPageState.computeReaderProgressSnapshot(state.progress), {
    percent: 92,
    text: "对照阅读已就绪",
    stage: "readying",
  });

  readerPageState.resetReaderProgressState(state);
  assert.deepEqual(state.progress, {
    metadataReady: false,
    sourceDone: false,
    translatedDone: false,
  });
});

test("reader progress presenter writes view state and posts progress messages", () => {
  const calls = [];
  const pageState = readerPageState.createReaderPageState();
  pageState.progress.metadataReady = true;
  pageState.progress.sourceDone = true;
  const presenter = readerProgressPresenter.createReaderProgressPresenter({
    animateProgressValue: (progressBarState, percent) => {
      calls.push(["animate", progressBarState === pageState.bootProgressBar, percent]);
    },
    messageTargetOrigin: () => "https://retainpdf.reader",
    parentWindow: () => ({
      postMessage(payload, origin) {
        calls.push(["message", payload, origin]);
      },
    }),
    setProgressText: (text) => {
      calls.push(["text", text]);
    },
  });

  const snapshot = presenter.sync(pageState);

  assert.deepEqual(snapshot, {
    percent: 54,
    text: "原始 PDF 已加载，正在加载译文 PDF…",
    stage: "pdfs",
  });
  assert.deepEqual(calls, [
    ["text", "原始 PDF 已加载，正在加载译文 PDF…"],
    ["animate", true, 54],
    ["message", {
      type: "retainpdf-reader-progress",
      stage: "pdfs",
      percent: 54,
      text: "原始 PDF 已加载，正在加载译文 PDF…",
    }, "https://retainpdf.reader"],
  ]);
});

test("reader viewer mount flow mounts source and translated PDFs in parallel", async () => {
  const calls = [];
  const result = await readerViewerMountFlow.mountReaderPdfPair({
    fetchProtected: async () => {},
    sourcePdf: "source.pdf",
    translatedPdfUrl: "translated.pdf",
    mountViewer: async (options) => {
      calls.push(["mount", options.key, options.itemOrUrl, options.emptyId]);
      if (options.key === "reader-translated-pdf") {
        throw new Error("translated unavailable");
      }
      return {
        key: options.key,
        pagesCount: 10,
        controller: { key: options.key },
      };
    },
    onSourceSettled: () => calls.push(["source-settled"]),
    onTranslatedSettled: () => calls.push(["translated-settled"]),
  });

  assert.deepEqual(result, {
    sourceReady: {
      key: "reader-pdf",
      pagesCount: 10,
      controller: { key: "reader-pdf" },
    },
    translatedReady: null,
  });
  assert.deepEqual(calls, [
    ["mount", "reader-pdf", "source.pdf", "reader-pdf-empty"],
    ["mount", "reader-translated-pdf", "translated.pdf", "reader-translation-empty"],
    ["source-settled"],
    ["translated-settled"],
  ]);
});

test("reader interaction flow owns primary viewer page state and region binding", () => {
  const calls = [];
  let mode = "compare";
  const pageState = readerPageState.createReaderPageState();
  const sourceReady = {
    key: "reader-pdf",
    pagesCount: 7,
    controller: { key: "source-controller" },
  };
  const translatedReady = {
    key: "reader-translated-pdf",
    pagesCount: 6,
    controller: { key: "translated-controller" },
  };

  const result = readerInteractionFlow.bindReaderInteractions({
    apiPrefix: "/api/v1",
    bindPrimary: (controller, onPageChange) => {
      calls.push(["bind-primary", controller.key]);
      onPageChange(controller.key === "source-controller" ? 3 : 4);
    },
    bindRegions: (options) => {
      calls.push([
        "bind-regions",
        options.regions.length,
        options.sourceController.key,
        options.translatedController.key,
        options.jobId,
        options.apiPrefix,
      ]);
    },
    fetchTranslationItem: async () => {},
    getReaderMode: () => mode,
    jobId: "job-reader",
    pageState,
    readerMetadata: {
      source: { page_count: 10 },
      translated: { page_count: 8 },
    },
    regionsPayload: {
      items: [{ item_id: "region-1" }],
    },
    scheduleScale: () => calls.push(["schedule-scale"]),
    setIndicator: (current, total) => calls.push(["indicator", current, total]),
    sourceReady,
    translatedReady,
  });

  assert.equal(result.primary, sourceReady);
  assert.equal(result.totalPages, 10);
  assert.deepEqual(pageState.reader, {
    currentPage: 3,
    primaryViewerKey: "reader-pdf",
    totalPages: 10,
  });
  mode = "translated";
  result.syncIndicatorForMode();
  assert.deepEqual(pageState.reader, {
    currentPage: 4,
    primaryViewerKey: "reader-translated-pdf",
    totalPages: 8,
  });
  assert.deepEqual(calls, [
    ["bind-primary", "source-controller"],
    ["indicator", 3, 10],
    ["bind-primary", "translated-controller"],
    ["indicator", 3, 10],
    ["bind-regions", 1, "source-controller", "translated-controller", "job-reader", "/api/v1"],
    ["schedule-scale"],
    ["indicator", 4, 8],
  ]);
});

test("reader dialog controller routes UI operations through view port", async () => {
  const calls = [];
  const previousWindow = global.window;
  const previousDocument = global.document;
  const previousCreateObjectURL = global.URL.createObjectURL;
  const previousRevokeObjectURL = global.URL.revokeObjectURL;
  const previousSetTimeout = global.setTimeout;
  const listeners = {};
  global.window = {
    ...previousWindow,
    history: {
      state: {},
      replaceState(_state, _title, url) {
        calls.push(["route", url]);
      },
    },
    location: {
      href: "http://localhost/index.html",
      origin: "http://localhost",
      protocol: "http:",
      hostname: "localhost",
    },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    setTimeout(callback) {
      callback();
      return 1;
    },
  };
  global.URL.createObjectURL = () => "blob:side-by-side";
  global.URL.revokeObjectURL = (url) => calls.push(["revoke", url]);
  global.setTimeout = (callback) => {
    callback();
    return 1;
  };
  global.document = {
    body: {
      appendChild: () => calls.push(["append-download-link"]),
    },
    createElement: () => ({
      click: () => calls.push(["click-download-link"]),
      remove: () => calls.push(["remove-download-link"]),
      set href(value) {
        calls.push(["download-href", value]);
      },
      set download(value) {
        calls.push(["download-name", value]);
      },
    }),
    getElementById: () => null,
    querySelector: () => null,
  };
  try {
    const feature = readerDialogController.mountReaderDialogFeature({
      state: {
        currentJobId: "job-reader",
        currentJobSnapshot: {
          job_id: "job-reader",
          source_pdf_url: "/api/v1/jobs/job-reader/artifacts/source_pdf",
          pdf_url: "/api/v1/jobs/job-reader/pdf",
        },
      },
      fetchProtected: async (url) => {
        calls.push(["fetch", url]);
        return {
          ok: true,
          body: null,
          blob: async () => new Blob(["side-by-side"], { type: "application/pdf" }),
          headers: {
            get: (name) => name === "content-disposition" ? 'attachment; filename="backend-side-by-side.pdf"' : "",
          },
        };
      },
      setText: (id, text) => calls.push(["text", id, text]),
      configPort: {
        isTrustedReaderMessage: () => true,
      },
      runtimePort: readerDialogRuntimePort.defaultReaderDialogRuntimePort,
      viewPort: {
        bindEvents: (handlers) => {
          calls.push(["bind"]);
          listeners.frameLoad = handlers.onFrameLoad;
          listeners.mergedDownload = handlers.onMergedDownload;
        },
        closeDialog: () => calls.push(["close"]),
        frameWindow: () => ({}),
        linkOpenState: () => ({ url: "", disabled: true }),
        loadedFrame: () => true,
        openDialog: () => calls.push(["open"]),
        restoreButton: () => {},
        setButtonBusy: () => "",
        setFrameSource: (url) => calls.push(["frame", url]),
        setLoadingProgress: (_progressState, percent, text) => calls.push(["progress", percent, text]),
        setLoadingVisible: (loading) => calls.push(["loading", loading]),
        setToolbarButtonState: (id, enabled, url = "") => calls.push(["toolbar", id, enabled, url]),
        toolbarButtonUrl: () => "",
      },
    });

    feature.bindEvents();
    feature.open("job-reader");
    listeners.message({
      data: {
        type: "retainpdf-reader-progress",
        percent: 72,
        text: "正在加载译文 PDF…",
        stage: "pdfs",
      },
    });
    listeners.frameLoad();
    await listeners.mergedDownload();
    feature.close();

    assert.deepEqual(calls.slice(0, 8), [
      ["bind"],
      ["route", "http://localhost/index.html?job_id=job-reader&view=reader"],
      ["loading", true],
      ["progress", 8, "正在准备对照阅读…"],
      ["frame", "http://localhost/reader.html?job_id=job-reader"],
      ["toolbar", "reader-source-download-btn", true, "http://retainpdf.local:41000/api/v1/jobs/job-reader/artifacts/source_pdf"],
      ["toolbar", "reader-translated-download-btn", true, "http://retainpdf.local:41000/api/v1/jobs/job-reader/pdf"],
      ["toolbar", "reader-merged-download-btn", true, "http://retainpdf.local:41000/api/v1/jobs/job-reader/pdf/side-by-side"],
    ]);
    assert.equal(calls.some((call) => call[0] === "open"), true);
    assert.equal(calls.some((call) => call[0] === "progress" && call[1] === 72), true);
    assert.deepEqual(
      calls.filter((call) => call[0] === "fetch"),
      [["fetch", "http://retainpdf.local:41000/api/v1/jobs/job-reader/pdf/side-by-side"]],
    );
    assert.equal(calls.some((call) => call[0] === "download-name" && call[1] === "job-reader-side-by-side.pdf"), true);
    assert.equal(calls.some((call) => call[0] === "close"), true);
    assert.equal(calls.some((call) => call[0] === "frame" && call[1] === "about:blank"), true);
  } finally {
    global.window = previousWindow;
    global.document = previousDocument;
    global.URL.createObjectURL = previousCreateObjectURL;
    global.URL.revokeObjectURL = previousRevokeObjectURL;
    global.setTimeout = previousSetTimeout;
  }
});

test("reader dialog runtime port reuses artifact pdf download names", () => {
  const port = readerDialogRuntimePort.createReaderDialogRuntimePort({
    getCurrentJobId: () => "job-reader",
    getCurrentJobSnapshot: () => ({
      job_id: "job-reader",
      book_summary: {
        source_file_name: "Density Functional Theory.pdf",
      },
    }),
    getCachedManifestFor: () => ({
      items: [
        {
          artifact_key: "source_pdf",
          file_name: "Density Functional Theory.pdf",
          ready: true,
          resource_path: "/api/v1/jobs/job-reader/artifacts/source_pdf",
        },
        {
          artifact_key: "pdf",
          ready: true,
          resource_path: "/api/v1/jobs/job-reader/pdf",
        },
      ],
    }),
  });
  const state = {};

  assert.deepEqual(port.currentArtifactUrls(state), {
    sourcePdf: "http://retainpdf.local:41000/api/v1/jobs/job-reader/artifacts/source_pdf",
    translatedPdf: "http://retainpdf.local:41000/api/v1/jobs/job-reader/pdf",
    sideBySidePdf: "http://retainpdf.local:41000/api/v1/jobs/job-reader/pdf/side-by-side",
  });
  assert.equal(
    port.sourcePdfDownloadName(state, "job-reader-source.pdf"),
    "Density Functional Theory.pdf",
  );
  assert.equal(
    port.translatedPdfDownloadName(state, "job-reader-translated.pdf"),
    "zh_Density Functional Theory.pdf",
  );
});

test("reader dialog runtime port falls back to the backend translated PDF route", () => {
  const port = readerDialogRuntimePort.createReaderDialogRuntimePort({
    getCurrentJobId: () => "job-reader",
    getCurrentJobSnapshot: () => ({
      job_id: "job-reader",
      output_pdf_ready: true,
    }),
    getCachedManifestFor: () => ({
      items: [
        {
          artifact_key: "source_pdf",
          ready: true,
          resource_path: "/api/v1/jobs/job-reader/artifacts/source_pdf",
        },
      ],
    }),
  });

  assert.deepEqual(port.currentArtifactUrls({}), {
    sourcePdf: "http://retainpdf.local:41000/api/v1/jobs/job-reader/artifacts/source_pdf",
    translatedPdf: "http://retainpdf.local:41000/api/v1/jobs/job-reader/pdf",
    sideBySidePdf: "http://retainpdf.local:41000/api/v1/jobs/job-reader/pdf/side-by-side",
  });
});

test("reader dialog runtime port enables completed list snapshots without ready flags", () => {
  const port = readerDialogRuntimePort.createReaderDialogRuntimePort({
    getCurrentJobId: () => "job-reader",
    getCurrentJobSnapshot: () => ({
      job_id: "job-reader",
      status: "succeeded",
    }),
    getCachedManifestFor: () => ({
      items: [
        {
          artifact_key: "source_pdf",
          ready: true,
          resource_path: "/api/v1/jobs/job-reader/artifacts/source_pdf",
        },
      ],
    }),
  });

  assert.deepEqual(port.currentArtifactUrls({}), {
    sourcePdf: "http://retainpdf.local:41000/api/v1/jobs/job-reader/artifacts/source_pdf",
    translatedPdf: "http://retainpdf.local:41000/api/v1/jobs/job-reader/pdf",
    sideBySidePdf: "http://retainpdf.local:41000/api/v1/jobs/job-reader/pdf/side-by-side",
  });
});

test("reader dialog runtime port uses the active reader job id for fallback routes", () => {
  const port = readerDialogRuntimePort.createReaderDialogRuntimePort({
    getCurrentJobId: () => "old-job",
    getCurrentJobSnapshot: () => ({
      job_id: "old-job",
      status: "succeeded",
    }),
    getCachedManifestFor: (_state, jobId) => ({
      items: [
        {
          artifact_key: "source_pdf",
          ready: true,
          resource_path: `/api/v1/jobs/${jobId}/artifacts/source_pdf`,
        },
      ],
    }),
  });

  assert.deepEqual(port.currentArtifactUrls({ readerJobId: "job-reader" }), {
    sourcePdf: "http://retainpdf.local:41000/api/v1/jobs/job-reader/artifacts/source_pdf",
    translatedPdf: "http://retainpdf.local:41000/api/v1/jobs/job-reader/pdf",
    sideBySidePdf: "http://retainpdf.local:41000/api/v1/jobs/job-reader/pdf/side-by-side",
  });
});
