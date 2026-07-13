import test from "node:test";
import assert from "node:assert/strict";

import { createInitialState } from "../src/js/state/slices.js";
import * as currentJobStateModule from "../src/js/features/job-runtime/current-job-state.js";
import { createSecondaryResourceStatePort } from "../src/js/features/job-runtime/secondary-resource-cache.js";
import { createJobRenderContextPort } from "../src/js/features/job-runtime/render-context.js";
import { normalizedStageEventRecord } from "../src/js/job-status/job-stage-event-record.js";
import { buildEventsPresentation } from "../src/js/status-detail/events.js";
import { createStatusDetailPresenter } from "../src/js/status-detail/presenter.js";
import { defaultStatusDetailPresenter } from "../src/js/features/status-detail/presenter-port.js";
import { createStatusDetailDialogViewPort } from "../src/js/features/status-detail/dialog-view-port.js";
import { createStatusDetailTranslationViewPort } from "../src/js/features/status-detail/translation-view-port.js";
import {
  defaultStatusDetailDialogViewPort,
  defaultStatusDetailTranslationViewPort,
} from "../src/js/ui/default-status-detail-adapters.js";
import { createStatusDetailComponentPort } from "../src/js/ui/status-detail-component-port.js";
import {
  resolveStageHistoryDuration,
  stageHistoryDisplay,
} from "../src/js/job/stage-history.js";
import { resolveLiveDurations } from "../src/js/job/durations.js";
import { buildStageHistoryPresentation } from "../src/js/status-detail/history.js";
import { buildStatusCardSnapshot } from "../src/js/job-status/status-card-snapshot.js";
import { buildJobStatusViewModel } from "../src/js/job-status/job-status-view-model.js";
import { createStatusDetailRuntimePort } from "../src/js/bootstrap/status-detail-runtime-port.js";
import { mountStatusDetailFeature } from "../src/js/features/status-detail/controller.js";
import * as translationStateModule from "../src/js/features/status-detail/translation-state.js";
import { createTranslationState } from "../src/js/features/status-detail/translation-state.js";
import * as translationRendererModule from "../src/js/features/status-detail/translation-renderer.js";
import { createStatusDetailTranslationDataPort } from "../src/js/features/status-detail/translation-data-port.js";
import { createStatusDetailTranslationTabPort } from "../src/js/features/status-detail/translation-tab-port.js";
import { createStatusDetailTranslationTabCoordinator } from "../src/js/features/status-detail/translation-tab-coordinator.js";
import { createStatusDetailEventCommands } from "../src/js/features/status-detail/event-commands.js";
import { createStatusDetailOverviewCoordinator } from "../src/js/features/status-detail/overview-coordinator.js";
import { createStatusDetailConfigPort } from "../src/js/features/status-detail/config-port.js";
import { createStatusDetailNavigationViewPort } from "../src/js/features/status-detail/navigation-view-port.js";
import {
  rerunCurrentJob,
  syncRerunAction,
} from "../src/js/features/status-detail/resume-actions.js";
import {
  renderTranslationEmpty,
  renderTranslationItemDetail,
  renderTranslationItems,
  renderTranslationReplay,
  renderTranslationSummary,
} from "../src/js/features/status-detail/translation-presenter.js";
import {
  buildJobDetailEventViewModel,
  buildJobDetailStatusViewModel,
} from "../src/js/job-detail/status-view-model.js";
import { createJobDetailConfigPort } from "../src/js/job-detail/config-port.js";
import { createJobDetailDataPort } from "../src/js/job-detail/data-port.js";
import { createJobDetailResumePort } from "../src/js/job-detail/resume-port.js";
import {
  renderJobDetailFailureSummary,
  renderJobDetailRuntimeSummary,
  summarizeMathMode,
} from "../src/js/job-detail/summary.js";
import {
  isReaderActionEnabled,
  renderJobDetailActionLinks,
} from "../src/js/job-detail/action-links.js";
import {
  loadAndRenderMarkdownFlow,
} from "../src/js/job-detail/markdown-flow.js";
import { renderJobDetailOverview } from "../src/js/job-detail/overview-renderer.js";
import {
  createJobDetailPageState,
  revokeJobDetailMarkdownImageUrls,
} from "../src/js/job-detail/page-state.js";

global.window ||= {};
global.window.location ||= {
  protocol: "http:",
  origin: "http://localhost",
  pathname: "/",
};

test("status detail presenter owns snapshot fallback rendering", () => {
  const calls = [];
  const presenter = createStatusDetailPresenter({
    renderSnapshotView: (snapshot) => {
      calls.push(["view", snapshot.headline.jobId]);
      return false;
    },
    renderSnapshotSections: (snapshot) => {
      calls.push(["sections", snapshot.headline.jobId]);
    },
  });

  const snapshot = presenter.renderDetails({
    job_id: "job-status-detail-presenter",
    status: "running",
  }, { items: [] });

  assert.equal(snapshot.headline.jobId, "job-status-detail-presenter");
  assert.deepEqual(calls, [
    ["view", "job-status-detail-presenter"],
    ["sections", "job-status-detail-presenter"],
  ]);
});

test("status detail snapshot runtime stage follows public presentation", () => {
  const presenter = createStatusDetailPresenter();
  const snapshot = presenter.renderDetails({
    job_id: "job-status-detail-public-stage",
    status: "running",
    display_stage: "translation",
    stage: "render_preprocess",
    current_stage: "render_preprocess",
    stage_detail: "render payload prewarm: ready",
    progress: { unit: "batch", current: 30, total: 100 },
  }, { items: [] });

  assert.equal(/render|prewarm|渲染/.test(snapshot.runtime.currentStage), false);
  assert.match(snapshot.runtime.currentStage, /translation|翻译|第 30\/100 批/);
});

test("status detail snapshot runtime stage follows normalized stage snapshot", () => {
  const presenter = createStatusDetailPresenter();
  const snapshot = presenter.renderDetails({
    job_id: "job-status-detail-normalized-stage",
    status: "running",
    stage: "render_preprocess",
    current_stage: "render_preprocess",
    stage_detail: "render payload prewarm: ready",
    progress: { unit: "step", current: 1, total: 3 },
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
  }, { items: [] });

  assert.equal(/render|prewarm|渲染/.test(snapshot.runtime.currentStage), false);
  assert.match(snapshot.runtime.currentStage, /翻译|第 30\/100 批/);
});

test("status detail snapshot does not use legacy user_stage as runtime public stage", () => {
  const presenter = createStatusDetailPresenter();
  const snapshot = presenter.renderDetails({
    job_id: "job-status-detail-legacy-user-stage",
    status: "running",
    user_stage: "translation",
    stage: "render_preprocess",
    current_stage: "render_preprocess",
    progress: { unit: "batch", current: 30, total: 100 },
  }, { items: [] });

  assert.equal(/translation|翻译|render|渲染/.test(snapshot.runtime.currentStage), false);
});

test("stage history display prefers public stage over raw internal stage", () => {
  const entry = {
    display_stage: "translation",
    stage: "render_preprocess",
    detail: "",
  };
  const display = stageHistoryDisplay(entry);

  assert.equal(display.title, "翻译准备 / 跨栏跨页判断");
  assert.equal(display.stage, "翻译准备 / 跨栏跨页判断");
  assert.equal(/render|prewarm|渲染/.test(`${display.title} ${display.stage}`), false);

  const presentation = buildStageHistoryPresentation({
    status: "running",
    stage_history: [
      {
        ...entry,
        enter_at: "2026-01-01T00:00:00Z",
      },
    ],
  }, {
    now: "2026-01-01T00:00:01Z",
  });

  assert.equal(presentation.hasItems, true);
  assert.match(presentation.markup, /翻译准备/);
  assert.equal(/render_preprocess|prewarm/.test(presentation.markup), false);
});

test("stage history presentation accepts backend runtime stage history payload", () => {
  const presentation = buildStageHistoryPresentation({
    status: "running",
    runtime: {
      stage_history: [
        {
          display_stage: "translation",
          stage: "render_preprocess",
          enter_at: "2026-01-01T00:00:00Z",
          duration_ms: 1000,
        },
      ],
    },
  });

  assert.equal(presentation.hasItems, true);
  assert.equal(presentation.emptyText, "暂无阶段记录");
  assert.match(presentation.markup, /翻译准备/);
  assert.equal(/后端未返回 runtime\.stage_history|render_preprocess/.test(presentation.markup), false);
});

test("default status detail presenter is owned by the feature port", () => {
  assert.equal(typeof defaultStatusDetailPresenter.renderDetails, "function");
  assert.equal(typeof defaultStatusDetailPresenter.renderSnapshot, "function");
});

test("status detail dialog view port supports pure injected render functions", () => {
  const calls = [];
  const port = createStatusDetailDialogViewPort({
    renderReplay: (payload) => calls.push(["replay", payload]),
    renderSnapshot: (snapshot) => calls.push(["snapshot", snapshot]),
  });
  const snapshot = { headline: { jobId: "job-dialog-port" } };
  const replay = { status: "ok" };

  port.renderSnapshot(snapshot);
  port.renderReplay(replay);

  assert.deepEqual(calls, [
    ["snapshot", snapshot],
    ["replay", replay],
  ]);
});

test("status detail translation view port supports pure injected render functions", () => {
  const calls = [];
  const port = createStatusDetailTranslationViewPort({
    renderItemDetail: (payload) => calls.push(["detail", payload]),
    renderItems: (payload) => calls.push(["items", payload]),
    renderReplay: (payload) => calls.push(["replay", payload]),
    renderSummary: (payload) => calls.push(["summary", payload]),
  });

  port.renderSummary({ summary: true });
  port.renderItems({ items: true });
  port.renderItemDetail({ detail: true });
  port.renderReplay({ replay: true });

  assert.deepEqual(calls, [
    ["summary", { summary: true }],
    ["items", { items: true }],
    ["detail", { detail: true }],
    ["replay", { replay: true }],
  ]);
});

test("status detail component port adapts dialog component render methods", () => {
  const calls = [];
  const componentPort = createStatusDetailComponentPort({
    resolveComponent: () => ({
      renderSnapshot: (payload) => calls.push(["snapshot", payload]),
      renderTranslationItemDetail: (payload) => calls.push(["detail", payload]),
      renderTranslationItems: (payload) => calls.push(["items", payload]),
      renderTranslationReplay: (payload) => calls.push(["replay", payload]),
      renderTranslationSummary: (payload) => calls.push(["summary", payload]),
    }),
  });

  componentPort.renderSnapshot({ snapshot: true });
  componentPort.renderSummary({ summary: true });
  componentPort.renderItems({ items: true });
  componentPort.renderItemDetail({ detail: true });
  componentPort.renderReplay({ replay: true });

  assert.deepEqual(calls, [
    ["snapshot", { snapshot: true }],
    ["summary", { summary: true }],
    ["items", { items: true }],
    ["detail", { detail: true }],
    ["replay", { replay: true }],
  ]);
});

test("default status detail adapters expose presenter and dialog ports", () => {
  assert.equal(typeof defaultStatusDetailPresenter.renderDetails, "function");
  assert.equal(typeof defaultStatusDetailPresenter.renderSnapshot, "function");
  assert.equal(typeof defaultStatusDetailDialogViewPort.renderSnapshot, "function");
  assert.equal(typeof defaultStatusDetailDialogViewPort.renderReplay, "function");
  assert.equal(typeof defaultStatusDetailTranslationViewPort.renderSummary, "function");
  assert.equal(typeof defaultStatusDetailTranslationViewPort.renderItems, "function");
  assert.equal(typeof defaultStatusDetailTranslationViewPort.renderItemDetail, "function");
  assert.equal(typeof defaultStatusDetailTranslationViewPort.renderReplay, "function");
});

test("status detail config port owns detail page urls", () => {
  const port = createStatusDetailConfigPort({
    buildPageUrl(path, params) {
      return `app://${path}?job_id=${params.job_id}`;
    },
  });

  assert.equal(port.buildDetailPageUrl("job-123"), "app://./detail.html?job_id=job-123");
  assert.equal(port.buildDetailPageUrl(""), "");
});

test("status detail navigation view port owns dialog navigation and filters", () => {
  const calls = [];
  const port = createStatusDetailNavigationViewPort({
    activateTab: (name) => calls.push(["activate", name]),
    bindEvents: ({ commands }) => calls.push(["bind", typeof commands.openOverview]),
    openDialog: (name) => calls.push(["open", name]),
    readTranslationFilter: () => ({ q: "term", finalStatus: "failed" }),
  });

  port.activateTab("translation");
  port.openDialog("overview");
  port.bindEvents({ commands: { openOverview() {} } });

  assert.deepEqual(port.readTranslationFilter(), { q: "term", finalStatus: "failed" });
  assert.deepEqual(calls, [
    ["activate", "translation"],
    ["open", "overview"],
    ["bind", "function"],
  ]);
});

test("job detail config port owns reader detail urls and share note", () => {
  const port = createJobDetailConfigPort({
    buildPageUrl(path, params) {
      return `app://${path}?job_id=${params.job_id}`;
    },
    isMock: () => true,
  });

  assert.equal(port.buildReaderPageUrl("job-123"), "app://./reader.html?job_id=job-123");
  assert.equal(port.buildReaderPageUrl(""), "");
  assert.equal(port.buildDetailPageUrl("job-456"), "app://./detail.html?job_id=job-456");
  assert.equal(port.buildDetailPageUrl(""), "");
  assert.equal(port.detailShareNote(), "当前为 mock 明细页，可直接分享当前链接。");

  const normalPort = createJobDetailConfigPort({
    buildPageUrl: () => "",
    isMock: () => false,
  });
  assert.equal(normalPort.detailShareNote(), "当前详情页可直接通过 URL 分享给其他人。");
});

test("job detail data port owns overview markdown and action API calls", async () => {
  const calls = [];
  const port = createJobDetailDataPort({
    apiPrefix: "/detail-api",
    loadJob: async (jobId, apiPrefix) => {
      calls.push(["job", jobId, apiPrefix]);
      return { job_id: jobId };
    },
    loadManifest: async (jobId, apiPrefix) => {
      calls.push(["manifest", jobId, apiPrefix]);
      return { items: [] };
    },
    loadDiagnostics: async (jobId, apiPrefix) => {
      calls.push(["diagnostics", jobId, apiPrefix]);
      throw new Error("diagnostics unavailable");
    },
    loadResumePlan: async (jobId, apiPrefix) => {
      calls.push(["resume-plan", jobId, apiPrefix]);
      throw new Error("resume unavailable");
    },
    loadMarkdownDocument: async (jobId, apiPrefix) => {
      calls.push(["markdown-document", jobId, apiPrefix]);
      return null;
    },
    loadMarkdown: async (jobId, apiPrefix) => {
      calls.push(["markdown", jobId, apiPrefix]);
      return { content: "# ok" };
    },
    loadEvents: async (jobId, apiPrefix, limit, offset) => {
      calls.push(["events", jobId, apiPrefix, limit, offset]);
      return { items: [] };
    },
    rerun: async (url) => {
      calls.push(["rerun", url]);
      return { job_id: "job-rerun" };
    },
    resume: async (jobId, apiPrefix) => {
      calls.push(["resume", jobId, apiPrefix]);
      return { job_id: "job-resume" };
    },
    fetchProtectedResource: async (url) => ({ url }),
  });

  assert.deepEqual(await port.loadOverview("job-detail"), {
    diagnosticsPayload: null,
    manifestPayload: { items: [] },
    payloadRaw: { job_id: "job-detail" },
    resumePlan: null,
  });
  assert.deepEqual(await port.loadMarkdownPayload("job-detail"), { content: "# ok" });
  assert.deepEqual(await port.fetchJobEvents("job-detail", port.apiPrefix, 10, 20), { items: [] });
  assert.deepEqual(await port.resumeJob("job-detail", port.apiPrefix), { job_id: "job-resume" });
  assert.deepEqual(await port.rerunJob("/rerun"), { job_id: "job-rerun" });
  assert.deepEqual(await port.fetchProtected("http://asset.test/file.pdf"), {
    url: "http://asset.test/file.pdf",
  });
  assert.deepEqual(calls, [
    ["job", "job-detail", "/detail-api"],
    ["manifest", "job-detail", "/detail-api"],
    ["diagnostics", "job-detail", "/detail-api"],
    ["resume-plan", "job-detail", "/detail-api"],
    ["markdown-document", "job-detail", "/detail-api"],
    ["markdown", "job-detail", "/detail-api"],
    ["events", "job-detail", "/detail-api", 10, 20],
    ["resume", "job-detail", "/detail-api"],
    ["rerun", "/rerun"],
  ]);
});


test("job detail resume port chooses resume by job id before rerun url", async () => {
  const calls = [];
  const port = createJobDetailResumePort({
    apiPrefix: "/detail-api",
    resumeJob: async (jobId, apiPrefix) => {
      calls.push(["resume", jobId, apiPrefix]);
      return { job_id: "job-resumed" };
    },
    rerunJob: async (url) => {
      calls.push(["rerun", url]);
      return { job_id: "job-rerun" };
    },
  });

  assert.deepEqual(await port.submit({ actionUrl: "/rerun-old", jobId: "job-current" }), {
    job_id: "job-resumed",
  });
  assert.deepEqual(await port.submit({ actionUrl: "/rerun-old", jobId: "" }), {
    job_id: "job-rerun",
  });
  assert.deepEqual(calls, [
    ["resume", "job-current", "/detail-api"],
    ["rerun", "/rerun-old"],
  ]);
});

test("job detail summary renderer owns runtime and failure text fields", () => {
  const fields = {};
  const setText = (id, value) => {
    fields[id] = value;
  };
  const job = {
    status: "failed",
    retry_count: 2,
    last_stage_transition_at: "2026-06-16T01:02:03Z",
    terminal_reason: "provider_error",
    request_payload_math_mode: "placeholder",
    invocation_protocol: "book.v1",
    stage_spec_version: "stage.v2",
    failure: {
      failure_category: "translation",
      failed_stage: "translation",
      retryable: true,
      suggestion: "retry later",
    },
    failure_diagnostic: {
      root_cause: "rate limit",
    },
    final_failure_summary: "翻译失败",
    log_tail: ["line a", "last line"],
  };

  renderJobDetailRuntimeSummary({
    durations: {
      stageElapsedText: "1分钟",
      totalElapsedText: "2分钟",
    },
    job,
    setText,
    statusViewModel: {
      stageDetail: "翻译失败",
      runtimeCurrentStage: "翻译",
    },
  });
  renderJobDetailFailureSummary({ job, setText });

  assert.equal(fields["detail-status-summary"], "任务已失败，请检查报错提示后重试。");
  assert.equal(fields["detail-stage-detail"], "翻译失败");
  assert.equal(fields["detail-runtime-current-stage"], "翻译");
  assert.equal(fields["detail-runtime-stage-elapsed"], "1分钟");
  assert.equal(fields["detail-runtime-total-elapsed"], "2分钟");
  assert.equal(fields["detail-runtime-retry-count"], "2");
  assert.equal(fields["detail-runtime-terminal-reason"], "provider_error");
  assert.equal(fields["detail-runtime-math-mode"], "placeholder - 公式占位保护");
  assert.equal(fields["detail-failure-summary"], "翻译失败");
  assert.equal(fields["detail-failure-category"], "translation");
  assert.equal(fields["detail-failure-stage"], "translation");
  assert.equal(fields["detail-failure-root-cause"], "rate limit");
  assert.equal(fields["detail-failure-suggestion"], "retry later");
  assert.equal(fields["detail-failure-last-log-line"], "last line");
  assert.equal(fields["detail-failure-retryable"], "是");
  assert.equal(summarizeMathMode({ request_payload_math_mode: "direct_typst" }), "direct_typst - 模型直出公式");
});

test("job detail action links own reader and pdf readiness rules", () => {
  const links = {};
  const setActionLink = (id, url, enabled) => {
    links[id] = { enabled: Boolean(enabled), url };
  };
  const manifestPayload = {
    items: [
      { artifact_key: "source_pdf", ready: true },
      { artifact_key: "translated_pdf", ready: true },
    ],
  };
  const job = { job_id: "job-reader" };
  const actions = {
    pdf: "/api/v1/jobs/job-reader/pdf",
    pdfEnabled: true,
  };

  assert.equal(isReaderActionEnabled({ actions, job, manifestPayload }), true);
  renderJobDetailActionLinks({ actions, job, manifestPayload, setActionLink });

  assert.equal(links["detail-reader-btn"].enabled, true);
  assert.match(links["detail-reader-btn"].url, /reader\.html\?job_id=job-reader/);
  assert.deepEqual(links["detail-pdf-btn"], {
    enabled: true,
    url: "/api/v1/jobs/job-reader/pdf",
  });
  assert.equal(isReaderActionEnabled({
    actions,
    job,
    manifestPayload: { items: [{ artifact_key: "translated_pdf", ready: true }] },
  }), false);
});

test("job detail markdown flow owns loading state and status fallbacks", async () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    getElementById() {
      return null;
    },
  };
  const fields = {};
  const links = {};
  const state = {};
  const setText = (id, value) => {
    fields[id] = value;
  };
  const setActionLink = (id, url, enabled) => {
    links[id] = { enabled: Boolean(enabled), url };
  };
  const markdownPayload = {
    content: "# ok",
    file_name: "book.md",
    raw_url: "/raw.md",
    json_url: "/markdown/document",
    images: [],
  };

  try {
    await loadAndRenderMarkdownFlow({
      fetchProtected: async () => {
        throw new Error("no image fetch expected");
      },
      job: {
        markdown_ready: true,
        artifacts: { markdown: { ready: true } },
      },
      jobId: "job-md",
      loadMarkdownPayload: async (jobId) => {
        assert.equal(jobId, "job-md");
        return markdownPayload;
      },
      markdownImageUrls: [],
      setActionLink,
      setText,
      state,
    });

    assert.equal(state.markdownPayload, markdownPayload);
    assert.equal(fields["detail-markdown-status"], "已加载 /markdown JSON · book.md");
    assert.equal(fields["detail-markdown-image-count"], "0");
    assert.equal(fields["detail-markdown-preview"], "# ok");
    assert.equal(links["detail-markdown-raw-btn"].enabled, true);
    assert.equal(links["detail-markdown-json-btn"].enabled, true);

    await loadAndRenderMarkdownFlow({
      fetchProtected: async () => ({}),
      job: {
        markdown_ready: true,
        artifacts: { markdown: { ready: true } },
      },
      jobId: "job-md",
      loadMarkdownPayload: async () => {
        throw new Error("markdown unavailable");
      },
      markdownImageUrls: [],
      setActionLink,
      setText,
      state: {},
    });

    assert.equal(fields["detail-markdown-status"], "markdown unavailable");
  } finally {
    globalThis.document = previousDocument;
  }
});



test("job detail overview renderer owns state updates and rerun status", () => {
  const previousDocument = globalThis.document;
  const rerunButton = { disabled: false };
  globalThis.document = {
    getElementById(id) {
      return id === "detail-rerun-btn" ? rerunButton : null;
    },
  };
  const state = { markdownImageUrls: [], eventsPayload: null };
  const fields = {};
  const links = {};
  try {
    renderJobDetailOverview({
      diagnosticsPayload: null,
      job: {
        job_id: "job-overview",
        status: "succeeded",
        actions: { rerun: { enabled: true, url: "/rerun/job-overview" } },
      },
      manifestPayload: { items: [] },
      resumePlan: { can_resume: true, from_stage: "translation" },
      setActionLink(id, url, enabled) {
        links[id] = { enabled: Boolean(enabled), url };
      },
      setEventsStatus(value) {
        fields.eventsStatus = value;
      },
      setText(id, value) {
        fields[id] = value;
      },
      state,
    });
  } finally {
    globalThis.document = previousDocument;
  }

  assert.equal(state.job.job_id, "job-overview");
  assert.deepEqual(state.manifestPayload, { items: [] });
  assert.equal(state.resumePlan.can_resume, true);
  assert.match(state.rerunActionUrl, /\/rerun\/job-overview$/);
  assert.equal(rerunButton.disabled, false);
  assert.equal(fields["detail-rerun-status"], "可从 translation 恢复");
  assert.equal(fields.eventsStatus, "尚未加载");
  assert.equal(links["detail-reader-btn"].enabled, false);
});

test("job detail page state owns initial shape and markdown image cleanup", () => {
  const state = createJobDetailPageState();
  assert.deepEqual(Object.keys(state), [
    "job",
    "manifestPayload",
    "markdownPayload",
    "markdownImageUrls",
    "eventsPayload",
    "eventsLoadingPromise",
    "rerunActionUrl",
    "resumePlan",
  ]);
  assert.equal(state.job, null);
  assert.deepEqual(state.markdownImageUrls, []);

  const revoked = [];
  const previousUrl = globalThis.URL;
  globalThis.URL = {
    ...previousUrl,
    revokeObjectURL(url) {
      revoked.push(url);
    },
  };
  try {
    state.markdownImageUrls.push("blob:a", "blob:b");
    revokeJobDetailMarkdownImageUrls(state);
  } finally {
    globalThis.URL = previousUrl;
  }

  assert.deepEqual(revoked, ["blob:a", "blob:b"]);
  assert.deepEqual(state.markdownImageUrls, []);
});

test("status detail runtime port narrows current job cache access", () => {
  const state = createInitialState();
  const port = createStatusDetailRuntimePort(state);
  const job = { job_id: "job-detail-port", status: "running" };
  const events = { items: [{ seq: 1, display_stage: "translation" }] };
  const diagnostics = { summary: "ok" };
  const resumePlan = { can_resume: true };

  const context = port.applyOverviewPayload({
    payload: {
      ...job,
      started_at: "2026-01-01T00:00:00Z",
      finished_at: "2026-01-01T00:02:00Z",
    },
    eventsPayload: events,
    diagnosticsPayload: diagnostics,
    resumePlan,
    fallbackJobId: job.job_id,
  });

  assert.equal(port.currentJobId(), job.job_id);
  assert.equal(context.job.job_id, job.job_id);
  assert.deepEqual(context.job.diagnostics, diagnostics);
  assert.deepEqual(context.events, events);
  assert.equal(port.currentJobSnapshot().job_id, job.job_id);
  assert.deepEqual(port.currentRenderContext(job.job_id).events, events);
  assert.equal(port.currentJobFinishedAt(), "2026-01-01T00:02:00Z");
  assert.equal(port.rerunContext().job.job_id, job.job_id);
  assert.deepEqual(port.rerunContext().resumePlan, resumePlan);
  assert.deepEqual(currentJobStateModule.createCurrentJobStatePort(state).getSnapshot().diagnostics, diagnostics);
  assert.deepEqual(createJobRenderContextPort(state).currentFor(job.job_id).events, events);
  assert.deepEqual(createSecondaryResourceStatePort(state).cachedFor("events", job.job_id), events);
});

test("status detail runtime port ignores stale resume plans", () => {
  const state = createInitialState();
  const job = { job_id: "job-current", status: "failed" };
  currentJobStateModule.syncCurrentJobSnapshot(state, job, job.job_id);
  currentJobStateModule.cacheJobResumePlan(state, "job-old", { can_resume: true });

  const port = createStatusDetailRuntimePort(state);

  assert.equal(port.currentJobId(), job.job_id);
  assert.deepEqual(port.rerunContext().job, job);
  assert.equal(port.rerunContext().resumePlan, null);
});

test("status detail runtime port reads current job store instead of legacy fields", () => {
  const state = createInitialState();
  const currentJobPort = currentJobStateModule.createCurrentJobStatePort(state);
  const job = { job_id: "job-store-authority", status: "failed" };
  const resumePlan = { can_resume: true };

  currentJobPort.syncSnapshot(job, job.job_id, {
    startedAt: "2026-02-01T00:00:00Z",
    finishedAt: "2026-02-01T00:03:00Z",
  });
  currentJobPort.cacheResumePlan(job.job_id, resumePlan);

  state.currentJobId = "legacy-wrong";
  state.currentJobSnapshot = { job_id: "legacy-wrong", status: "running" };
  state.currentJobResumePlanJobId = "legacy-wrong";
  state.currentJobResumePlan = { can_resume: false };
  state.currentJobFinishedAt = "legacy-finished-at";

  const port = createStatusDetailRuntimePort(state);

  assert.equal(port.currentJobId(), job.job_id);
  assert.deepEqual(port.currentJobSnapshot(), job);
  assert.deepEqual(port.currentResumePlan(), resumePlan);
  assert.deepEqual(port.rerunContext(), { job, resumePlan });
  assert.equal(port.currentJobFinishedAt(), "2026-02-01T00:03:00Z");
});

test("status detail resume actions route UI side effects through view port", async () => {
  const calls = [];
  const viewPort = {
    closeDialog: () => calls.push(["close"]),
    setRerunAction: (payload) => calls.push(["action", payload.enabled, payload.status]),
    setRerunDisabled: (disabled) => calls.push(["disabled", disabled]),
  };
  const rerunContext = {
    job: {
      job_id: "job-resume-action",
      status: "failed",
      actions: {
        rerun: {
          enabled: true,
          url: "/api/v1/jobs/job-resume-action/rerun",
        },
      },
    },
    resumePlan: { can_resume: true, from_stage: "translation" },
  };
  const textCalls = [];
  const pollingCalls = [];
  const resolveActions = (job) => ({
    rerun: job.actions.rerun.url,
    rerunEnabled: job.actions.rerun.enabled,
  });

  const actionUrl = syncRerunAction({
    ...rerunContext,
    viewPort,
    resolveActions,
  });
  await rerunCurrentJob({
    rerunContext,
    rerunJob: async (url) => {
      calls.push(["rerun", url]);
      return { job_id: "job-resumed-action" };
    },
    setText: (...args) => textCalls.push(args),
    startPolling: (jobId) => pollingCalls.push(jobId),
    viewPort,
    resolveActions,
  });

  assert.match(actionUrl, /\/api\/v1\/jobs\/job-resume-action\/rerun$/);
  assert.deepEqual(calls, [
    ["action", true, "可从 translation 恢复"],
    ["action", true, "正在提交恢复任务..."],
    ["disabled", true],
    ["rerun", actionUrl],
    ["close"],
  ]);
  assert.deepEqual(textCalls, [["error-box", "已创建恢复任务 job-resumed-action，开始轮询。"]]);
  assert.deepEqual(pollingCalls, ["job-resumed-action"]);
});

test("status detail overview coordinator renders cached snapshot before fresh payload", async () => {
  const state = createInitialState();
  const runtimePort = createStatusDetailRuntimePort(state);
  const snapshots = [];
  const renders = [];
  currentJobStateModule.syncCurrentJobSnapshot(state, {
    job_id: "job-overview",
    status: "running",
    display_stage: "translation",
  }, "job-overview");

  const coordinator = createStatusDetailOverviewCoordinator({
    runtimePort,
    apiPrefix: "/api/v1",
    fetchJobPayload: async (jobId, apiPrefix) => {
      assert.equal(jobId, "job-overview");
      assert.equal(apiPrefix, "/api/v1");
      return {
        job_id: "job-overview",
        status: "succeeded",
        display_stage: "done",
      };
    },
    fetchJobEvents: async (_jobId, _apiPrefix, limit, afterSeq) => {
      assert.equal(limit, 200);
      assert.equal(afterSeq, 0);
      return { items: [{ seq: 2, display_stage: "done" }] };
    },
    fetchJobDiagnostics: async () => ({ summary: "ok" }),
    fetchResumePlan: async () => ({ can_resume: false }),
    renderJob: (context) => renders.push(context),
    renderOverviewSnapshot: (context) => snapshots.push(context),
  });

  await coordinator.ensureLoaded();

  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[0].job.job_id, "job-overview");
  assert.equal(snapshots[0].job.status, "running");
  assert.equal(snapshots[1].job.status, "succeeded");
  assert.equal(renders.length, 1);
  assert.equal(runtimePort.currentJobSnapshot().diagnostics.summary, "ok");
  assert.equal(runtimePort.rerunContext().resumePlan.can_resume, false);
});

test("status detail overview coordinator reuses in-flight refresh", async () => {
  const state = createInitialState();
  const runtimePort = createStatusDetailRuntimePort(state);
  currentJobStateModule.syncCurrentJobSnapshot(state, {
    job_id: "job-overview-inflight",
    status: "running",
  }, "job-overview-inflight");
  let fetchCount = 0;
  let resolvePayload;
  const payloadPromise = new Promise((resolve) => {
    resolvePayload = resolve;
  });
  const coordinator = createStatusDetailOverviewCoordinator({
    runtimePort,
    fetchJobPayload: () => {
      fetchCount += 1;
      return payloadPromise;
    },
    renderOverviewSnapshot() {},
  });

  const first = coordinator.ensureLoaded();
  const second = coordinator.ensureLoaded();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fetchCount, 1);
  resolvePayload({ job_id: "job-overview-inflight", status: "succeeded" });
  await Promise.all([first, second]);
  assert.equal(fetchCount, 1);
});

test("status detail overview coordinator ignores stale fresh payloads", async () => {
  const state = createInitialState();
  const runtimePort = createStatusDetailRuntimePort(state);
  const renders = [];
  currentJobStateModule.syncCurrentJobSnapshot(state, {
    job_id: "job-a",
    status: "running",
  }, "job-a");
  let resolvePayload;
  const payloadPromise = new Promise((resolve) => {
    resolvePayload = resolve;
  });
  const coordinator = createStatusDetailOverviewCoordinator({
    runtimePort,
    fetchJobPayload: () => payloadPromise,
    fetchJobEvents: async () => ({ items: [{ seq: 1, display_stage: "translation" }] }),
    fetchResumePlan: async () => ({ can_resume: true }),
    renderJob: (context) => renders.push(context),
    renderOverviewSnapshot() {},
  });

  const refresh = coordinator.ensureLoaded();
  await new Promise((resolve) => setImmediate(resolve));
  currentJobStateModule.syncCurrentJobSnapshot(state, {
    job_id: "job-b",
    status: "running",
  }, "job-b");
  resolvePayload({
    job_id: "job-a",
    status: "succeeded",
  });
  await refresh;

  const snapshot = currentJobStateModule.createCurrentJobStatePort(state).getSnapshot();
  assert.equal(snapshot.jobId, "job-b");
  assert.equal(snapshot.snapshot.job_id, "job-b");
  assert.notEqual(snapshot.resumePlanJobId, "job-a");
  assert.equal(renders.length, 0);
});

test("status detail overview refresh does not overwrite a newer current job", async () => {
  const previousDocument = global.document;
  const previousWindow = global.window;
  const snapshots = [];
  const renders = [];
  const state = createInitialState();
  currentJobStateModule.syncCurrentJobSnapshot(state, {
    job_id: "job-a",
    status: "running",
    display_stage: "translation",
  }, "job-a");
  global.document = {
    querySelector(selector) {
      if (selector === "status-detail-dialog") {
        return {
          renderSnapshot(snapshot) {
            snapshots.push(snapshot);
          },
          setRerunAction() {},
        };
      }
      return null;
    },
    addEventListener() {},
    querySelectorAll() {
      return [];
    },
    getElementById() {
      return null;
    },
  };
  global.window = previousWindow || {};

  let resolvePayload;
  const payloadPromise = new Promise((resolve) => {
    resolvePayload = resolve;
  });
  const feature = mountStatusDetailFeature({
    state,
    runtimePort: createStatusDetailRuntimePort(state),
    apiPrefix: "/api/v1",
    fetchJobPayload: () => payloadPromise,
    fetchJobEvents: async () => ({ items: [{ seq: 1, display_stage: "translation" }] }),
    fetchJobDiagnostics: async () => ({ summary: "old job" }),
    fetchResumePlan: async () => ({ can_resume: true }),
    fetchTranslationDiagnostics: async () => ({}),
    fetchTranslationItems: async () => ({
      total: 1,
      items: [{ item_id: "item-dialog-port" }],
    }),
    fetchTranslationItem: async () => ({}),
    replayTranslationItem: async () => ({}),
    rerunJob: async () => ({}),
    renderJob: (context) => renders.push(context),
    startPolling() {},
    setText() {},
    dialogViewPort: {
      renderSnapshot: (snapshot) => snapshots.push(snapshot),
      renderReplay() {},
    },
  });

  try {
    const refresh = feature.ensureOverviewData();
    await new Promise((resolve) => setImmediate(resolve));
    currentJobStateModule.syncCurrentJobSnapshot(state, {
      job_id: "job-b",
      status: "running",
      display_stage: "ocr",
    }, "job-b");
    resolvePayload({
      job_id: "job-a",
      status: "succeeded",
      display_stage: "done",
    });
    await refresh;

    const snapshot = currentJobStateModule.createCurrentJobStatePort(state).getSnapshot();
    assert.equal(snapshot.jobId, "job-b");
    assert.equal(snapshot.snapshot.job_id, "job-b");
    assert.notEqual(snapshot.resumePlanJobId, "job-a");
    assert.equal(renders.length, 0);
    assert.equal(snapshots.at(0).headline.jobId, "job-a");
    assert.equal(snapshots.length, 1);
  } finally {
    global.document = previousDocument;
    global.window = previousWindow;
  }
});

test("status detail controller routes snapshot rendering through dialog view port", async () => {
  const previousDocument = global.document;
  const state = createInitialState();
  currentJobStateModule.syncCurrentJobSnapshot(state, {
    job_id: "job-dialog-port",
    status: "running",
    display_stage: "translation",
  }, "job-dialog-port");
  const calls = [];
  global.document = {
    addEventListener() {},
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    getElementById() {
      return null;
    },
  };
  const feature = mountStatusDetailFeature({
    state,
    runtimePort: createStatusDetailRuntimePort(state),
    apiPrefix: "/api/v1",
    fetchJobPayload: async () => ({
      job_id: "job-dialog-port",
      status: "running",
      display_stage: "translation",
    }),
    fetchJobEvents: async () => ({ items: [{ seq: 1, display_stage: "translation" }] }),
    fetchJobDiagnostics: async () => null,
    fetchResumePlan: async () => null,
    fetchTranslationDiagnostics: async () => ({}),
    fetchTranslationItems: async () => ({ items: [] }),
    fetchTranslationItem: async () => ({}),
    replayTranslationItem: async () => ({}),
    rerunJob: async () => ({}),
    renderJob: () => {},
    startPolling() {},
    setText() {},
    dialogViewPort: {
      renderSnapshot: (snapshot) => calls.push(["snapshot", snapshot.headline.jobId]),
      renderReplay: (payload) => calls.push(["replay", payload.status, payload.hasResult]),
    },
    resumeViewPort: {
      closeDialog() {},
      setRerunAction: (payload) => calls.push(["rerun", payload.enabled]),
      setRerunDisabled() {},
    },
  });

  try {
    await feature.ensureOverviewData();
  } finally {
    global.document = previousDocument;
  }

  assert.equal(calls.some((call) => call[0] === "snapshot" && call[1] === "job-dialog-port"), true);
  assert.equal(calls.some((call) => call[0] === "rerun"), true);
});

test("status detail controller routes navigation through view port", async () => {
  const previousDocument = global.document;
  const state = createInitialState();
  currentJobStateModule.syncCurrentJobSnapshot(state, {
    job_id: "job-navigation-port",
    status: "running",
    display_stage: "translation",
  }, "job-navigation-port");
  const calls = [];
  const itemQueries = [];
  let commands = null;
  global.document = {
    querySelector() {
      return null;
    },
    getElementById() {
      return null;
    },
  };
  const feature = mountStatusDetailFeature({
    state,
    runtimePort: createStatusDetailRuntimePort(state),
    apiPrefix: "/api/v1",
    fetchJobPayload: async () => ({ job_id: "job-navigation-port" }),
    fetchJobEvents: async () => ({ items: [] }),
    fetchJobDiagnostics: async () => null,
    fetchResumePlan: async () => null,
    fetchTranslationDiagnostics: async () => ({}),
    fetchTranslationItems: async (_jobId, _apiPrefix, query) => {
      itemQueries.push({ ...query });
      return { items: [] };
    },
    fetchTranslationItem: async () => ({}),
    replayTranslationItem: async () => ({}),
    rerunJob: async () => ({}),
    renderJob: () => {},
    startPolling() {},
    setText() {},
    dialogViewPort: {
      renderSnapshot() {},
      renderReplay() {},
    },
    translationViewPort: {
      renderItemDetail: () => {},
      renderItems: () => {},
      renderReplay: () => {},
      renderSummary: () => {},
    },
    navigationViewPort: {
      activateTab: (name) => calls.push(["activate", name]),
      bindEvents: (payload) => {
        calls.push(["bind", typeof payload.commands.activateTab]);
        commands = payload.commands;
      },
      openDialog: (name) => calls.push(["open", name]),
      readTranslationFilter: () => ({
        finalStatus: "failed",
        q: "needle",
      }),
    },
    resumeViewPort: {
      closeDialog() {},
      setRerunAction() {},
      setRerunDisabled() {},
    },
  });

  try {
    feature.bindEvents();
    feature.activateDetailTab("overview");
    feature.openStatusDetailDialog("translation");
    await new Promise((resolve) => setImmediate(resolve));
    await commands.applyTranslationFilter();

    assert.deepEqual(calls, [
      ["bind", "function"],
      ["activate", "overview"],
      ["open", "translation"],
    ]);
    assert.deepEqual(itemQueries.at(-1), {
      finalStatus: "failed",
      limit: 20,
      offset: 0,
      q: "needle",
    });
  } finally {
    global.document = previousDocument;
  }
});

test("status detail controller delegates translation commands through translation tab port", async () => {
  const state = createInitialState();
  currentJobStateModule.syncCurrentJobSnapshot(state, {
    job_id: "job-translation-tab-injected",
    status: "running",
  }, "job-translation-tab-injected");
  const calls = [];
  let commands = null;
  const feature = mountStatusDetailFeature({
    state,
    runtimePort: createStatusDetailRuntimePort(state),
    apiPrefix: "/api/v1",
    fetchJobPayload: async () => ({ job_id: "job-translation-tab-injected" }),
    fetchJobEvents: async () => ({ items: [] }),
    fetchJobDiagnostics: async () => null,
    fetchResumePlan: async () => null,
    fetchTranslationDiagnostics: async () => ({}),
    fetchTranslationItems: async () => ({ items: [] }),
    fetchTranslationItem: async () => ({}),
    replayTranslationItem: async () => ({}),
    rerunJob: async () => ({}),
    renderJob: () => {},
    startPolling() {},
    setText() {},
    dialogViewPort: {
      renderSnapshot() {},
      renderReplay() {},
    },
    navigationViewPort: {
      activateTab: (name) => calls.push(["activate", name]),
      bindEvents: (payload) => {
        commands = payload.commands;
      },
      openDialog: (name) => calls.push(["open", name]),
      readTranslationFilter: () => ({
        finalStatus: "failed",
        q: "needle",
      }),
    },
    resumeViewPort: {
      closeDialog() {},
      setRerunAction() {},
      setRerunDisabled() {},
    },
    translationTabPort: {
      applyFilter: async (query) => calls.push(["filter", query]),
      changePage: async (direction) => calls.push(["page", direction]),
      ensureLoaded: async (options) => calls.push(["ensure", options]),
      loadItem: async (jobId, itemId) => calls.push(["item", jobId, itemId]),
      replaySelected: async () => calls.push(["replay"]),
      renderItemError: (error) => calls.push(["item-error", error.message]),
      renderReplayError: (error) => calls.push(["replay-error", error.message]),
    },
  });

  feature.bindEvents();
  feature.activateDetailTab("translation");
  feature.openStatusDetailDialog("translation");
  await commands.applyTranslationFilter();
  await commands.changeTranslationPage("next");
  await commands.selectTranslationItem("item-1");
  await commands.replayCurrentTranslationItem();

  assert.deepEqual(calls, [
    ["activate", "translation"],
    ["ensure", { force: false }],
    ["open", "translation"],
    ["ensure", { force: false }],
    ["filter", { finalStatus: "failed", q: "needle" }],
    ["page", "next"],
    ["item", "job-translation-tab-injected", "item-1"],
    ["replay"],
  ]);
});

test("status detail translation presenter routes rendering through view port", () => {
  const calls = [];
  const viewPort = {
    renderItemDetail: (payload) => calls.push(["detail", payload]),
    renderItems: (payload) => calls.push(["items", payload]),
    renderReplay: (payload) => calls.push(["replay", payload]),
    renderSummary: (payload) => calls.push(["summary", payload]),
  };
  const state = createTranslationState();
  state.summary = {
    summary: {
      counts: { translated: 2 },
      final_status_counts: { ok: 1 },
      provider_family: "deepseek",
    },
  };
  state.total = 1;
  state.list = [{
    item_id: "item-1",
    page_number: 7,
    block_type: "paragraph",
    classification_label: "body",
    source_preview: "hello world",
    final_status: "translated",
  }];
  state.selectedItemId = "item-1";
  state.selectedItem = {
    item_id: "item-1",
    item: {
      item_id: "item-1",
      page_number: 7,
      source_text: "hello",
      translated_text: "你好",
      final_status: "translated",
    },
  };
  state.replay = {
    payload: {
      replay_result: { ok: true },
    },
  };

  renderTranslationEmpty("empty text", { viewPort });
  renderTranslationSummary(state, { viewPort });
  renderTranslationItems(state, { viewPort });
  renderTranslationItemDetail(state, { viewPort });
  renderTranslationReplay(state, { viewPort });

  assert.deepEqual(calls.slice(0, 4).map((call) => call[0]), ["summary", "items", "detail", "replay"]);
  assert.equal(calls[0][1].emptyText, "empty text");
  assert.equal(calls[4][0], "summary");
  assert.equal(calls[4][1].providerFamily, "deepseek");
  assert.equal(calls[5][0], "items");
  assert.equal(calls[5][1].hasItems, true);
  assert.match(calls[5][1].markup, /item-1/);
  assert.equal(calls[6][0], "detail");
  assert.equal(calls[6][1].hasItem, true);
  assert.match(calls[6][1].markup, /hello/);
  assert.equal(calls[7][0], "replay");
  assert.equal(calls[7][1].status, "重放完成");
});

test("status detail translation state stays independent from presenter rendering", () => {
  assert.equal(typeof translationStateModule.createTranslationState, "function");
  assert.equal(typeof translationStateModule.resetTranslationState, "function");
  assert.equal("renderTranslationEmpty" in translationStateModule, false);
  assert.equal(typeof translationRendererModule.renderTranslationEmpty, "function");
  assert.equal(typeof translationRendererModule.renderTranslationItems, "function");
});

test("status detail translation data port owns query paging and item selection", async () => {
  const state = createTranslationState();
  let current = "job-translation-port";
  const calls = [];
  const port = createStatusDetailTranslationDataPort({
    translationState: state,
    apiPrefix: "/api/v1",
    currentJobId: () => current,
    fetchTranslationDiagnostics: async (jobId, apiPrefix) => {
      calls.push(["summary", jobId, apiPrefix]);
      return { summary: { counts: { total: 2 } } };
    },
    fetchTranslationItems: async (jobId, apiPrefix, query) => {
      calls.push(["items", jobId, apiPrefix, { ...query }]);
      return {
        total: 2,
        items: [
          { item_id: "item-1" },
          { item_id: "item-2" },
        ],
      };
    },
    fetchTranslationItem: async (jobId, itemId, apiPrefix) => {
      calls.push(["item", jobId, itemId, apiPrefix]);
      return { item_id: itemId, item: { item_id: itemId, source_text: "source" } };
    },
    replayTranslationItem: async (jobId, itemId, apiPrefix) => {
      calls.push(["replay", jobId, itemId, apiPrefix]);
      return { payload: { replay_result: "ok" } };
    },
  });

  port.applyQuery({ finalStatus: "failed", q: "term" });
  const selection = await port.loadSummaryAndItems({ selectFirst: true });
  assert.deepEqual(selection, {
    jobId: "job-translation-port",
    selectedItemId: "item-1",
    shouldLoadSelectedItem: true,
    selectionChanged: true,
  });
  assert.equal(state.query.finalStatus, "failed");
  assert.equal(state.query.q, "term");
  assert.equal(state.query.offset, 0);
  assert.equal(state.summary.summary.counts.total, 2);
  assert.equal(state.selectedItemId, "item-1");

  await port.loadItem(selection.jobId, selection.selectedItemId);
  assert.equal(state.selectedItem.item.item_id, "item-1");
  await port.replaySelectedItem();
  assert.equal(state.replay.payload.replay_result, "ok");

  assert.equal(port.changePage("next"), true);
  assert.equal(state.query.offset, 20);
  const keptSelection = await port.loadItems(current, { selectFirst: true });
  assert.deepEqual(keptSelection, {
    selectedItemId: "item-1",
    shouldLoadSelectedItem: false,
    selectionChanged: false,
  });

  current = "job-other";
  assert.equal(port.syncJob(), "job-other");
  assert.equal(state.jobId, "job-other");
  assert.equal(state.selectedItemId, "");
});

test("status detail translation data port clears stale selected item for empty result pages", async () => {
  const state = createTranslationState();
  state.jobId = "job-empty";
  state.selectedItemId = "item-old";
  state.selectedItem = { item_id: "item-old" };
  state.replay = { payload: {} };
  const port = createStatusDetailTranslationDataPort({
    translationState: state,
    apiPrefix: "/api/v1",
    currentJobId: () => "job-empty",
    fetchTranslationDiagnostics: async () => ({}),
    fetchTranslationItems: async () => ({ total: 0, items: [] }),
    fetchTranslationItem: async () => {
      throw new Error("empty item pages should not load item details");
    },
    replayTranslationItem: async () => ({}),
  });

  const selection = await port.loadItems("job-empty", { selectFirst: true });

  assert.deepEqual(selection, {
    selectedItemId: "",
    shouldLoadSelectedItem: false,
    selectionChanged: true,
  });
  assert.equal(state.selectedItemId, "");
  assert.equal(state.selectedItem, null);
  assert.equal(state.replay, null);
});

test("status detail translation tab coordinator owns render orchestration", async () => {
  const state = createTranslationState();
  const renderCalls = [];
  const dataPort = createStatusDetailTranslationDataPort({
    translationState: state,
    apiPrefix: "/api/v1",
    currentJobId: () => "job-tab",
    fetchTranslationDiagnostics: async () => ({ summary: { counts: { total: 1 } } }),
    fetchTranslationItems: async () => ({
      total: 1,
      items: [{ item_id: "item-tab" }],
    }),
    fetchTranslationItem: async (_jobId, itemId) => ({
      item_id: itemId,
      item: { item_id: itemId },
    }),
    replayTranslationItem: async () => ({ payload: { replay_result: "ok" } }),
  });
  const coordinator = createStatusDetailTranslationTabCoordinator({
    dataPort,
    renderEmpty: (message) => renderCalls.push(["empty", message]),
    renderSummary: () => renderCalls.push(["summary"]),
    renderItems: (options = {}) => renderCalls.push(["items", options]),
    renderItemDetail: (options = {}) => renderCalls.push(["detail", options]),
    renderReplay: () => renderCalls.push(["replay"]),
    setReplayLoading: (payload) => renderCalls.push(["replay-loading", payload]),
  });

  await coordinator.ensureLoaded();

  assert.equal(state.loaded, true);
  assert.equal(state.selectedItemId, "item-tab");
  assert.equal(state.selectedItem.item.item_id, "item-tab");
  assert.deepEqual(renderCalls.map((call) => call[0]), [
    "empty",
    "summary",
    "items",
    "detail",
    "replay",
    "items",
    "detail",
    "replay",
    "detail",
  ]);

  renderCalls.length = 0;
  await coordinator.ensureLoaded();
  assert.deepEqual(renderCalls.map((call) => call[0]), ["summary", "items", "detail", "replay"]);

  renderCalls.length = 0;
  await coordinator.changePage("prev");
  assert.deepEqual(renderCalls, []);
});

test("status detail translation tab coordinator applies filters and replays selected item", async () => {
  const state = createTranslationState();
  let itemCalls = 0;
  const renderCalls = [];
  const dataPort = createStatusDetailTranslationDataPort({
    translationState: state,
    apiPrefix: "/api/v1",
    currentJobId: () => "job-tab-filter",
    fetchTranslationDiagnostics: async () => ({}),
    fetchTranslationItems: async () => ({
      total: 0,
      items: [],
    }),
    fetchTranslationItem: async () => {
      itemCalls += 1;
      return {};
    },
    replayTranslationItem: async () => ({ payload: { replay_result: "ok" } }),
  });
  const coordinator = createStatusDetailTranslationTabCoordinator({
    dataPort,
    renderEmpty: (message) => renderCalls.push(["empty", message]),
    renderSummary: () => renderCalls.push(["summary"]),
    renderItems: (options = {}) => renderCalls.push(["items", options]),
    renderItemDetail: (options = {}) => renderCalls.push(["detail", options]),
    renderReplay: () => renderCalls.push(["replay"]),
    setReplayLoading: (payload) => renderCalls.push(["replay-loading", payload]),
  });

  await coordinator.applyFilter({ finalStatus: "failed", q: "abc" });
  assert.equal(state.query.finalStatus, "failed");
  assert.equal(state.query.q, "abc");
  assert.equal(state.selectedItemId, "");
  assert.equal(itemCalls, 0);
  assert.deepEqual(renderCalls.map((call) => call[0]), [
    "summary",
    "summary",
    "items",
    "detail",
    "replay",
  ]);

  renderCalls.length = 0;
  state.selectedItemId = "item-replay";
  await coordinator.replaySelected();
  assert.equal(state.replay.payload.replay_result, "ok");
  assert.deepEqual(renderCalls.map((call) => call[0]), ["replay-loading", "replay"]);
});

test("status detail translation tab port owns state data and renderer wiring", async () => {
  let currentJobId = "job-translation-tab-port";
  const replayCalls = [];
  const port = createStatusDetailTranslationTabPort({
    apiPrefix: "/api/v1",
    currentJobId: () => currentJobId,
    dialogViewPort: {
      renderReplay: (payload) => replayCalls.push(payload),
    },
    translationViewPort: {
      renderItemDetail() {},
      renderItems() {},
      renderReplay() {},
      renderSummary() {},
    },
    fetchTranslationDiagnostics: async () => ({
      summary: {
        counts: { total: 1 },
        final_status_counts: { translated: 1 },
      },
    }),
    fetchTranslationItems: async () => ({
      total: 1,
      items: [{
        item_id: "item-port-1",
        page_number: 3,
        final_status: "translated",
      }],
    }),
    fetchTranslationItem: async (_jobId, itemId) => ({
      item_id: itemId,
      item: {
        item_id: itemId,
        source_text: "source",
        translated_text: "target",
        final_status: "translated",
      },
    }),
    replayTranslationItem: async () => ({
      payload: {
        replay_result: { ok: true },
      },
    }),
  });

  await port.ensureLoaded();
  assert.equal(port.state.loaded, true);
  assert.equal(port.state.selectedItemId, "item-port-1");
  assert.equal(port.state.selectedItem.item.source_text, "source");

  await port.replaySelected();
  assert.equal(replayCalls[0].status, "重放中...");
  assert.equal(port.state.replay.payload.replay_result.ok, true);

  port.renderReplayError(new Error("port replay failed"));
  assert.equal(replayCalls.at(-1).status, "重放失败");
  assert.match(replayCalls.at(-1).markup, /port replay failed/);

  currentJobId = "";
  await port.ensureLoaded({ force: true });
  assert.equal(port.state.jobId, "");
});

test("status detail event commands adapt view events to stable feature commands", async () => {
  const calls = [];
  const commands = createStatusDetailEventCommands({
    openStatusDetailDialog: (tab) => calls.push(["open", tab]),
    activateDetailTab: (name) => calls.push(["tab", name]),
    applyTranslationFilter: async () => calls.push(["filter"]),
    changeTranslationPage: async (direction) => calls.push(["page", direction]),
    loadTranslationItem: async (jobId, itemId) => calls.push(["item", jobId, itemId]),
    replayTranslation: async () => calls.push(["replay"]),
    rerunCurrentJob: async () => calls.push(["rerun"]),
    currentJobId: () => "job-command",
    renderTranslationItemError: (error) => calls.push(["item-error", error.message]),
    renderTranslationReplayError: (error) => calls.push(["replay-error", error.message]),
  });

  commands.openOverview();
  commands.activateTab("translation");
  await commands.applyTranslationFilter();
  await commands.changeTranslationPage("next");
  await commands.selectTranslationItem(" item-1 ");
  await commands.replayCurrentTranslationItem();
  await commands.rerunCurrentJob();
  await commands.selectTranslationItem("");

  assert.deepEqual(calls, [
    ["open", "overview"],
    ["tab", "translation"],
    ["filter"],
    ["page", "next"],
    ["item", "job-command", "item-1"],
    ["replay"],
    ["rerun"],
  ]);
});

test("status detail event commands render command errors at the boundary", async () => {
  const calls = [];
  const commands = createStatusDetailEventCommands({
    openStatusDetailDialog() {},
    activateDetailTab() {},
    applyTranslationFilter: async () => {},
    changeTranslationPage: async () => {},
    loadTranslationItem: async () => {
      throw new Error("item failed");
    },
    replayTranslation: async () => {
      throw new Error("replay failed");
    },
    rerunCurrentJob: async () => {},
    currentJobId: () => "job-command-error",
    renderTranslationItemError: (error) => calls.push(["item-error", error.message]),
    renderTranslationReplayError: (error) => calls.push(["replay-error", error.message]),
  });

  await commands.selectTranslationItem("item-err");
  await commands.replayCurrentTranslationItem();

  assert.deepEqual(calls, [
    ["item-error", "item failed"],
    ["replay-error", "replay failed"],
  ]);
});

test("job detail status view model follows main lane display stage", () => {
  const snapshot = buildJobDetailStatusViewModel(
    {
      job_id: "job-detail",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      substage: "translation_batches",
      progress: { unit: "batch", current: 28, total: 5216 },
    },
    {
      items: [
        {
          seq: 41,
          display_stage: "render",
          stage: "render_preprocess",
          substage: "render_prewarm",
          lane: "background",
          progress: { unit: "step", current: 1, total: 3 },
          message: "render payload prewarm",
        },
        {
          seq: 42,
          display_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          lane: "main",
          progress: { unit: "batch", current: 29, total: 5216 },
        },
      ],
    },
  );

  assert.equal(snapshot.stageKey, "translate");
  assert.equal(snapshot.progressText, "第 29/5216 批");
  assert.match(snapshot.runtimeCurrentStage, /翻译|第 29\/5216 批/);
});

test("job detail status view model does not expose legacy stage detail fallback", () => {
  const snapshot = buildJobDetailStatusViewModel(
    {
      job_id: "job-detail-legacy-fallback",
      status: "running",
      display_stage: "translation",
      stage: "render_preprocess",
      current_stage: "render_preprocess",
      stage_detail: "render payload prewarm: ready",
      progress: { unit: "batch", current: 30, total: 100 },
    },
    { items: [] },
  );

  assert.equal(snapshot.stageKey, "translate");
  assert.equal(/render|prewarm|渲染/.test(snapshot.runtimeCurrentStage), false);
});

test("job detail status view model does not use legacy user_stage as runtime stage", () => {
  const snapshot = buildJobDetailStatusViewModel(
    {
      job_id: "job-detail-legacy-user-stage",
      status: "running",
      user_stage: "translation",
      stage: "render_preprocess",
      current_stage: "render_preprocess",
      progress: { unit: "batch", current: 30, total: 100 },
    },
    { items: [] },
  );

  assert.equal(snapshot.stageKey, "running");
  assert.equal(/translation|翻译|render|渲染/.test(snapshot.runtimeCurrentStage), false);
});

test("job detail event view model uses structured progress fields", () => {
  const viewModel = buildJobDetailEventViewModel({
    seq: 99,
    display_stage: "translation",
    stage: "render_preprocess",
    substage: "translation_batches",
    lane: "main",
    event_type: "progress",
    progress: { unit: "batch", current: 4000, total: 5216 },
    stage_detail: "book: completed batch 1/2",
    message: "book: completed batch 1/2",
  });

  assert.equal(viewModel.displayStage, "translation");
  assert.equal(viewModel.substage, "translation_batches");
  assert.equal(viewModel.lane, "main");
  assert.equal(viewModel.progressText, "第 4000/5216 批");
  assert.equal(viewModel.progressCurrent, 4000);
  assert.equal(viewModel.progressTotal, 5216);
  assert.equal(viewModel.progressUnit, "batch");
});

test("job detail event view model does not promote canonical events without display_stage", () => {
  const viewModel = buildJobDetailEventViewModel({
    seq: 100,
    lane: "main",
    user_stage: "render",
    stage: "render_preprocess",
    substage: "render_prewarm",
    event_type: "progress",
    progress: { unit: "step", current: 1, total: 3 },
  });

  assert.equal(viewModel.displayStage, "");
  assert.equal(viewModel.stageText, "进度 1/3");
  assert.equal(viewModel.lane, "main");
  assert.equal(viewModel.progressCurrent, 1);
  assert.equal(viewModel.progressTotal, 3);
});

test("normalized event display record prefers structured progress over provider text", () => {
  const record = normalizedStageEventRecord({
    seq: 100,
    display_stage: "translation",
    stage: "translating",
    substage: "translation_batches",
    lane: "main",
    event_type: "progress",
    progress: { unit: "batch", current: 4000, total: 5216 },
    stage_detail: "book: completed batch 1/2",
    message: "book: completed batch 1/2",
  });

  assert.equal(record.displayStage, "translation");
  assert.equal(record.stageText, "第 4000/5216 批");
  assert.equal(record.progressText, "第 4000/5216 批");
  assert.equal(record.progress.current, 4000);
  assert.equal(record.progress.total, 5216);
});

test("status detail event presentation uses normalized progress records", () => {
  const presentation = buildEventsPresentation({
    items: [
      {
        seq: 101,
        display_stage: "translation",
        stage: "translating",
        substage: "translation_batches",
        lane: "main",
        event_type: "progress",
        progress: { unit: "batch", current: 4001, total: 5216 },
        stage_detail: "book: completed batch 1/2",
        message: "book: completed batch 1/2",
      },
    ],
  });

  assert.equal(presentation.count, 1);
  assert.match(presentation.markup, /translation/);
  assert.match(presentation.markup, /translation_batches/);
  assert.match(presentation.markup, /第 4001\/5216 批/);
});

test("job status view model preserves status card snapshot fields", () => {
  const job = {
    job_id: "job-status-model",
    status: "succeeded",
    display_stage: "done",
    output_pdf_ready: true,
    progress_percent: 100,
    actions: {
      download_pdf: {
        enabled: true,
        url: "/api/v1/jobs/job-status-model/pdf",
      },
    },
  };
  const events = { items: [] };
  const stagePresentation = {
    label: "完成",
    detail: "翻译 PDF 已生成",
    stageKey: "done",
    visualStageKey: "done",
    progressCurrent: 100,
    progressTotal: 100,
    progressPercent: 100,
    progressText: "已完成",
    progressUnit: "percent",
    progressIndeterminate: false,
    substageKey: "done",
    stageProgressByKey: {
      done: {
        current: 100,
        total: 100,
        percent: 100,
        unit: "percent",
      },
    },
  };
  const input = {
    state: createInitialState(),
    job,
    jobId: job.job_id,
    stagePresentation,
    events,
    manifest: null,
    stageActions: null,
    publicErrorText: "-",
  };

  const viewModel = buildJobStatusViewModel(input);
  const snapshot = buildStatusCardSnapshot(input);

  assert.deepEqual(snapshot, viewModel);
  assert.equal(viewModel.jobId, "job-status-model");
  assert.equal(viewModel.stageKey, "done");
  assert.equal(viewModel.progressText, "已完成");
  assert.equal(viewModel.errorText, "");
  assert.equal(viewModel.pdfReady, true);
});

test("job status view model carries manifest actions and retry actions", () => {
  const job = {
    job_id: "job-status-actions",
    status: "succeeded",
    display_stage: "done",
    output_pdf_ready: true,
    artifacts: {},
  };
  const manifest = {
    items: [
      {
        artifact_key: "source_pdf",
        ready: true,
        resource_path: "/api/v1/jobs/job-status-actions/artifacts/source_pdf",
      },
      {
        artifact_key: "markdown_bundle_zip",
        ready: true,
        resource_path: "/api/v1/jobs/job-status-actions/artifacts/markdown_bundle_zip",
      },
      {
        artifact_key: "pdf",
        ready: true,
        resource_path: "/api/v1/jobs/job-status-actions/pdf",
      },
    ],
  };
  const viewModel = buildJobStatusViewModel({
    state: createInitialState(),
    job,
    jobId: job.job_id,
    events: { items: [] },
    manifest,
    stageActions: {
      stages: [
        {
          stage: "translation",
          label: "重新翻译",
          can_retry: true,
        },
        {
          stage: "render",
          can_retry: false,
          disabled_reason: "等待翻译完成",
        },
      ],
    },
    publicErrorText: "",
    stagePresentation: {
      label: "完成",
      detail: "翻译 PDF 已生成",
      stageKey: "done",
      visualStageKey: "done",
      progressCurrent: 100,
      progressTotal: 100,
      progressPercent: 100,
      progressText: "已完成",
      progressUnit: "percent",
      progressIndeterminate: false,
      substageKey: "done",
    },
  });

  assert.equal(viewModel.readerReady, true);
  assert.equal(viewModel.sourcePdfReady, true);
  assert.match(viewModel.sourcePdfUrl, /source_pdf/);
  assert.equal(viewModel.markdownBundleReady, true);
  assert.match(viewModel.markdownBundleUrl, /include_job_dir=true/);
  assert.equal(viewModel.stageRetryActions.translate.canRetry, true);
  assert.equal(viewModel.stageRetryActions.translate.stage, "translation");
  assert.equal(viewModel.stageRetryActions.render.canRetry, false);
  assert.equal(viewModel.stageRetryActions.render.disabledReason, "等待翻译完成");
});

test("live duration helpers use explicit timing inputs instead of runtime globals", () => {
  const job = {
    status: "succeeded",
    display_stage: "done",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:03:00Z",
    stage_history: [
      {
        stage: "rendering",
        enter_at: "2026-01-01T00:02:00Z",
      },
    ],
  };

  const durations = resolveLiveDurations(job, {
    finishedAtFallback: "2026-01-01T00:05:00Z",
  });

  assert.equal(durations.totalElapsedText, "5分 0秒");
  assert.equal(
    resolveStageHistoryDuration(job.stage_history[0], job, {
      finishedAtFallback: "2026-01-01T00:05:00Z",
    }),
    180000,
  );
});

test("live duration helpers keep ambiguous succeeded payloads running", () => {
  const job = {
    status: "succeeded",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:03:00Z",
    stage_started_at: "2026-01-01T00:02:00Z",
    stage_history: [
      {
        stage: "translating",
        enter_at: "2026-01-01T00:02:00Z",
      },
    ],
  };

  const durations = resolveLiveDurations(job, {
    finishedAtFallback: "2026-01-01T00:05:00Z",
    now: "2026-01-01T00:06:00Z",
  });

  assert.equal(durations.stageElapsedText, "4分 0秒");
  assert.equal(durations.totalElapsedText, "6分 0秒");
  assert.equal(
    resolveStageHistoryDuration(job.stage_history[0], job, {
      finishedAtFallback: "2026-01-01T00:05:00Z",
      now: "2026-01-01T00:06:00Z",
    }),
    240000,
  );
});

test("job status view model accepts explicit finished-at fallback", () => {
  const job = {
    job_id: "job-status-duration",
    status: "succeeded",
    display_stage: "done",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:02:00Z",
  };
  const viewModel = buildJobStatusViewModel({
    state: createInitialState(),
    job,
    jobId: job.job_id,
    events: { items: [] },
    manifest: null,
    stageActions: null,
    publicErrorText: "",
    finishedAtFallback: "2026-01-01T00:04:00Z",
    stagePresentation: {
      label: "完成",
      detail: "翻译 PDF 已生成",
      stageKey: "done",
      visualStageKey: "done",
      progressCurrent: 100,
      progressTotal: 100,
      progressPercent: 100,
      progressText: "已完成",
      progressUnit: "percent",
      progressIndeterminate: false,
      substageKey: "done",
    },
  });

  assert.equal(viewModel.elapsed, "4分 0秒");
});

test("job status view model does not read runtime finished-at fallback implicitly", () => {
  const localState = createInitialState();
  localState.currentJobFinishedAt = "2026-01-01T00:10:00Z";
  const job = {
    job_id: "job-status-explicit-duration",
    status: "succeeded",
    display_stage: "done",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:02:00Z",
  };

  const viewModel = buildJobStatusViewModel({
    state: localState,
    job,
    jobId: job.job_id,
    events: { items: [] },
    manifest: null,
    stageActions: null,
    publicErrorText: "",
    stagePresentation: {
      label: "完成",
      detail: "翻译 PDF 已生成",
      stageKey: "done",
      visualStageKey: "done",
      progressCurrent: 100,
      progressTotal: 100,
      progressPercent: 100,
      progressText: "已完成",
      progressUnit: "percent",
      progressIndeterminate: false,
      substageKey: "done",
    },
  });

  assert.equal(viewModel.elapsed, "2分 0秒");
});
