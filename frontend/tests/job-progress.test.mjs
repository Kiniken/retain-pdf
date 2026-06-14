import test from "node:test";
import assert from "node:assert/strict";

import { normalizeJobPayload } from "../src/js/job/normalize.js";
import {
  collectStageProgressByKey,
  resolveDisplayedStagePresentation,
} from "../src/js/job-status/job-stage-presentation.js";
import { summarizeStageProgressText } from "../src/js/job-status/job-status-summary-progress.js";
import { recentJobRawImageUrls } from "../src/js/features/recent-jobs/card-presenter.js";
import { fetchRecentJobEvents } from "../src/js/features/job-runtime/runtime-state.js";

test("normalizeJobPayload completes progress for succeeded jobs", () => {
  const job = normalizeJobPayload({
    code: 0,
    data: {
      job_id: "job-1",
      status: "succeeded",
      progress: {
        current: 2,
        total: 8,
        percent: 25,
      },
    },
  });

  assert.equal(job.progress_current, 8);
  assert.equal(job.progress_total, 8);
  assert.equal(job.progress_percent, 100);
});

test("summarizeStageProgressText formats stable user-facing progress copy", () => {
  assert.equal(
    summarizeStageProgressText({
      status: "running",
      current_stage: "translation_batches",
      progress_current: 2,
      progress_total: 5,
      progress_unit: "batch",
    }),
    "第 2/5 批",
  );

  assert.equal(
    summarizeStageProgressText({
      status: "running",
      current_stage: "compile",
      substage: "render_compile",
      progress_current: 1,
      progress_total: 2,
      progress_unit: "step",
    }),
    "编译 1/2",
  );

  assert.equal(
    summarizeStageProgressText({
      status: "running",
      current_stage: "rendering",
      substage: "render_prewarm",
      progress_current: 1,
      progress_total: 4,
      progress_unit: "step",
    }),
    "预热 1/4",
  );
});

test("english batch detail is parsed as translation batch progress", () => {
  assert.equal(
    summarizeStageProgressText({
      status: "running",
      display_stage: "translation",
      stage: "translating",
      substage: "translation_batches",
      stage_detail: "book: completed batch 789/5216",
      progress_unit: "batch",
    }),
    "第 789/5216 批",
  );
});

test("resolveDisplayedStagePresentation exposes composite render compile progress", () => {
  const job = {
    job_id: "job-render",
    workflow: "book",
    status: "running",
    current_stage: "rendering",
    progress_current: 0,
    progress_total: 100,
  };
  const eventsPayload = {
    items: [
      {
        seq: 1,
        event_type: "stage_progress",
        stage: "render_prepare",
        substage: "render_prepare",
        progress_current: 1,
        progress_total: 2,
        progress_unit: "step",
      },
      {
        seq: 2,
        event_type: "stage_progress",
        stage: "rendering",
        substage: "render_pages",
        progress_current: 5,
        progress_total: 10,
        progress_unit: "page",
      },
      {
        seq: 3,
        event_type: "stage_progress",
        stage: "compile",
        substage: "render_compile",
        progress_current: 1,
        progress_total: 2,
        progress_unit: "step",
      },
    ],
  };

  const presentation = resolveDisplayedStagePresentation(job, eventsPayload);

  assert.equal(presentation.stageKey, "render");
  assert.equal(presentation.progressCurrent, 90);
  assert.equal(presentation.progressTotal, 100);
  assert.equal(presentation.progressUnit, "percent");
  assert.equal(presentation.progressText, "编译 1/2");
});

test("resolveDisplayedStagePresentation preserves composite render prewarm progress text", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-prewarm",
      workflow: "book",
      status: "running",
      current_stage: "rendering",
    },
    {
      items: [
        {
          seq: 1,
          event_type: "stage_progress",
          stage: "rendering",
          substage: "render_prewarm",
          progress_current: 2,
          progress_total: 4,
          progress_unit: "step",
        },
      ],
    },
  );

  assert.equal(presentation.progressCurrent, 5);
  assert.equal(presentation.progressTotal, 100);
  assert.equal(presentation.progressUnit, "percent");
  assert.equal(presentation.progressText, "预热 2/4");
});

test("resolveDisplayedStagePresentation accepts structured event progress objects", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-structured-progress",
      workflow: "book",
      status: "running",
      stage: "render",
      progress: {
        current: 0,
        total: 100,
        percent: 0,
        unit: "percent",
      },
    },
    {
      items: [
        {
          seq: 1,
          stage: "render",
          substage: "render_pages",
          progress: {
            unit: "page",
            current: 4,
            total: 20,
            percent: 20,
          },
        },
        {
          seq: 2,
          stage: "render",
          substage: "render_compile",
          progress: {
            unit: "step",
            current: 1,
            total: 2,
            percent: 50,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "render");
  assert.equal(presentation.progressCurrent, 90);
  assert.equal(presentation.progressTotal, 100);
  assert.equal(presentation.progressUnit, "percent");
  assert.equal(presentation.progressText, "编译 1/2");
});

test("collectStageProgressByKey keeps translation substage progress", () => {
  const progressByKey = collectStageProgressByKey(
    {
      job_id: "job-translate",
      workflow: "book",
      status: "running",
      current_stage: "translation_batches",
    },
    {
      items: [
        {
          seq: 1,
          stage: "continuation_review",
          substage: "continuation_review",
          progress_current: 2,
          progress_total: 10,
          progress_unit: "page",
        },
        {
          seq: 2,
          stage: "page_policies",
          substage: "page_policies",
          progress_current: 3,
          progress_total: 10,
          progress_unit: "page",
        },
        {
          seq: 3,
          stage: "translation_batches",
          substage: "translation_batches",
          progress_current: 4,
          progress_total: 8,
          progress_unit: "batch",
        },
      ],
    },
  );

  assert.equal(progressByKey.translate.current, 4);
  assert.equal(progressByKey.translate.total, 8);
  assert.equal(progressByKey.translate.progressText, "第 4/8 批");
  assert.equal(progressByKey.translate.bySubstage.continuation_review.current, 2);
  assert.equal(progressByKey.translate.bySubstage.page_policies.current, 3);
});

test("translation main progress prefers translation batches over later helper substages", () => {
  const progressByKey = collectStageProgressByKey(
    {
      job_id: "job-translate-prefer-batches",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          progress: {
            unit: "batch",
            current: 120,
            total: 900,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "translation",
          stage: "page_policies",
          substage: "page_policies",
          progress: {
            unit: "page",
            current: 3,
            total: 10,
          },
        },
      ],
    },
  );

  assert.equal(progressByKey.translate.current, 120);
  assert.equal(progressByKey.translate.total, 900);
  assert.equal(progressByKey.translate.progressText, "第 120/900 批");
  assert.equal(progressByKey.translate.bySubstage.page_policies.progressText, "第 3/10 页");
});

test("current translation helper substage uses its own progress", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-translate-page-policies",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "page_policies",
      substage: "page_policies",
      progress: {
        unit: "page",
        current: 3,
        total: 10,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          progress: {
            unit: "batch",
            current: 120,
            total: 900,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "translation",
          stage: "page_policies",
          substage: "page_policies",
          progress: {
            unit: "page",
            current: 3,
            total: 10,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "page_policies");
  assert.equal(presentation.progressText, "第 3/10 页");
});

test("translation batch event beats stale helper progress from job snapshot", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-translate-stale-helper",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "page_policies",
      substage: "page_policies",
      progress: {
        unit: "page",
        current: 28,
        total: 33,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          stage_detail: "book: completed batch 789/5216",
          progress: {
            unit: "batch",
            current: 789,
            total: 5216,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.progressText, "第 789/5216 批");
  assert.equal(presentation.progressUnit, "batch");
});

test("new public stage field supports stage=translation without display_stage", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-public-stage",
      workflow: "book",
      status: "running",
      stage: "translation",
      substage: "translation_tail_retry",
      progress: {
        unit: "batch",
        current: 2,
        total: 7,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          stage: "translation",
          substage: "translation_tail_retry",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 2,
            total: 7,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.substageKey, "translation_tail_retry");
  assert.equal(presentation.progressText, "第 2/7 批");
});

test("render page progress is preferred over render step progress for historical render summary", () => {
  const progressByKey = collectStageProgressByKey(
    {
      job_id: "job-render-substages",
      workflow: "book",
      status: "running",
      stage: "render",
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          stage: "render",
          substage: "render_prepare",
          progress: {
            unit: "step",
            current: 1,
            total: 3,
          },
        },
        {
          seq: 2,
          lane: "main",
          stage: "render",
          substage: "render_pages",
          progress: {
            unit: "page",
            current: 20,
            total: 100,
          },
        },
        {
          seq: 3,
          lane: "main",
          stage: "render",
          substage: "render_compile",
          progress: {
            unit: "step",
            current: 1,
            total: 4,
          },
        },
      ],
    },
  );

  assert.equal(progressByKey.render.progressText, "编译 1/4");
  assert.equal(progressByKey.render.progressUnit, "percent");
  assert.equal(progressByKey.render.current, 85);
  assert.equal(progressByKey.render.total, 100);
});

test("frontend progress uses canonical display_stage event contract", () => {
  const progressByKey = collectStageProgressByKey(
    {
      job_id: "job-new-events",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      progress: {
        unit: "batch",
        current: 1,
        total: 8,
      },
    },
    {
      items: [
        {
          seq: 1,
          display_stage: "ocr",
          stage: "ocr_processing",
          substage: "provider_processing",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 12,
            total: 34,
          },
        },
        {
          seq: 2,
          display_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 4,
            total: 8,
          },
        },
        {
          seq: 3,
          display_stage: "render",
          stage: "rendering",
          substage: "render_pages",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 5,
            total: 20,
          },
        },
      ],
    },
  );

  assert.equal(progressByKey.ocr.progressText, "第 12/34 页");
  assert.equal(progressByKey.translate.progressText, "第 4/8 批");
  assert.equal(progressByKey.render.progressText, "第 5/20 页");
});

test("background render events do not advance the main status card", () => {
  const job = {
    job_id: "job-parallel",
    workflow: "book",
    status: "running",
    display_stage: "translation",
    stage: "translating",
    progress: {
      unit: "batch",
      current: 120,
      total: 900,
    },
  };
  const eventsPayload = {
    items: [
      {
        seq: 1,
        lane: "main",
        display_stage: "translation",
        stage: "translating",
        substage: "translation_batches",
        event_type: "progress",
        progress: {
          unit: "batch",
          current: 120,
          total: 900,
        },
      },
      {
        seq: 2,
        lane: "background",
        display_stage: "render",
        stage: "render_preprocess",
        substage: "render_prewarm",
        event_type: "progress",
        progress: {
          unit: "step",
          current: 2,
          total: 3,
        },
      },
    ],
  };

  const presentation = resolveDisplayedStagePresentation(job, eventsPayload);
  const progressByKey = collectStageProgressByKey(job, eventsPayload);

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.progressText, "第 120/900 批");
  assert.equal(progressByKey.render, undefined);
});

test("main render prepare events do not override an explicit translation snapshot", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-parallel-main-render",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      progress: {
        unit: "batch",
        current: 120,
        total: 900,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 120,
            total: 900,
          },
        },
        {
          seq: 2,
          lane: "main",
          display_stage: "render",
          stage: "render_preprocess",
          substage: "render_prewarm",
          event_type: "progress",
          progress: {
            unit: "step",
            current: 1,
            total: 3,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.progressText, "第 120/900 批");
});

test("explicit translation job stage wins over render preprocess internals", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-render-preprocess-in-translation",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "render_preprocess",
      substage: "render_prewarm",
      stage_detail: "render payload prewarm: ready indents=333 geometry=836",
      progress: {
        unit: "batch",
        current: 240,
        total: 900,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 240,
            total: 900,
          },
        },
        {
          seq: 2,
          lane: "background",
          display_stage: "render",
          stage: "render_preprocess",
          substage: "render_prewarm",
          event_type: "progress",
          message: "render payload prewarm: ready indents=333 geometry=836",
          progress: {
            unit: "step",
            current: 2,
            total: 3,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.stageKeyTrusted, true);
  assert.equal(presentation.progressText, "第 240/900 批");
});

test("render words in message do not override display_stage", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-render-message",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "translating",
      progress: {
        unit: "batch",
        current: 8,
        total: 20,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          message: "render payload prewarm: ready indents=333 geometry=836",
          progress: {
            unit: "batch",
            current: 8,
            total: 20,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.progressText, "第 8/20 批");
});

test("translation render prewarm snapshot keeps translation wording", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-translate-render-wording",
      workflow: "book",
      status: "running",
      display_stage: "translation",
      stage: "render_preprocess",
      substage: "render_prewarm",
      stage_detail: "render payload prewarm: ready indents=333 geometry=836 elapsed=1.58s",
      progress: {
        unit: "batch",
        current: 120,
        total: 900,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "translation",
          stage: "translating",
          substage: "translation_batches",
          event_type: "progress",
          progress: {
            unit: "batch",
            current: 120,
            total: 900,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "translate");
  assert.equal(presentation.detail, "正在翻译正文内容");
  assert.equal(presentation.progressText, "第 120/900 批");
});

test("ocr processing display stage does not regress to upload wording", () => {
  const presentation = resolveDisplayedStagePresentation(
    {
      job_id: "job-ocr-processing",
      workflow: "book",
      status: "running",
      display_stage: "ocr",
      stage: "ocr_upload",
      substage: "provider_processing",
      stage_detail: "上传完成，等待 OCR 解析",
      progress: {
        unit: "page",
        current: 12,
        total: 34,
      },
    },
    {
      items: [
        {
          seq: 1,
          lane: "main",
          display_stage: "ocr",
          stage: "ocr_processing",
          substage: "provider_processing",
          event_type: "progress",
          progress: {
            unit: "page",
            current: 12,
            total: 34,
          },
        },
      ],
    },
  );

  assert.equal(presentation.stageKey, "ocr");
  assert.equal(presentation.detail, "正在执行云端 OCR");
  assert.equal(presentation.progressText, "第 12/34 页");
});

test("recent job covers include stable fallback image endpoints", () => {
  assert.deepEqual(
    recentJobRawImageUrls({
      job_id: "job-cover",
      thumbnail_url: "",
      cover_url: "",
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

test("fetchRecentJobEvents returns the latest event page for long jobs", async () => {
  const calls = [];
  const payload = await fetchRecentJobEvents({
    apiPrefix: "/api/v1",
    jobId: "job-long-events",
    fetchJobEvents: async (_jobId, _apiPrefix, limit, offset) => {
      calls.push({ limit, offset });
      const count = offset >= 1000 ? 20 : limit;
      return {
        items: Array.from({ length: count }, (_, index) => ({ seq: offset + index + 1 })),
        limit,
        offset,
      };
    },
  });

  assert.deepEqual(calls, [
    { limit: 500, offset: 0 },
    { limit: 500, offset: 500 },
    { limit: 500, offset: 1000 },
  ]);
  assert.equal(payload.offset, 1000);
  assert.equal(payload.items[0].seq, 1001);
});
