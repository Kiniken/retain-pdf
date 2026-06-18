import test, { before } from "node:test";
import assert from "node:assert/strict";

let readerDataPort;
let readerInteractionFlow;
let readerPdfDocument;
let readerPageConfig;
let readerPageState;
let readerProgressPresenter;
let readerResourceResolver;
let readerStartup;
let readerViewerMountFlow;
let readerDialogController;
let readerDialogRuntimePort;

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
  readerStartup = await import("../src/js/reader/startup.js");
  readerViewerMountFlow = await import("../src/js/reader/viewer-mount-flow.js");
  readerDialogController = await import("../src/js/features/reader-dialog/controller.js");
  readerDialogRuntimePort = await import("../src/js/bootstrap/reader-dialog-runtime-port.js");
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
  assert.deepEqual(calls, [
    ["job", "job-reader", "/reader-api"],
    ["manifest", "job-reader", "/reader-api"],
    ["regions", "job-reader", "/reader-api"],
    ["metadata", "job-reader", "/reader-api"],
    ["translation", "job-reader", "item-1", "/reader-api"],
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
      onPageChange(3);
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
    jobId: "job-reader",
    pageState,
    readerMetadata: {
      source: { page_count: 10 },
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
  assert.deepEqual(calls, [
    ["bind-primary", "source-controller"],
    ["indicator", 3, 10],
    ["bind-regions", 1, "source-controller", "translated-controller", "job-reader", "/api/v1"],
    ["schedule-scale"],
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
