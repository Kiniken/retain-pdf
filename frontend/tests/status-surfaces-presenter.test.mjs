import test from "node:test";
import assert from "node:assert/strict";

import { createInitialState } from "../src/js/state/slices.js";
import {
  buildSecondaryStatusPatchPayload,
  buildStatusViewModelForRuntime,
  renderJobSecondaryStatusPatch,
  statusDetailDurationOptionsForRuntime,
} from "../src/js/ui/status-surfaces-presenter.js";

function fakeRuntime(state = createInitialState()) {
  return {
    state,
    finishedAtFallback: () => "2026-01-01T00:04:00Z",
  };
}

test("status surfaces presenter builds status view model through runtime boundary", () => {
  const runtime = fakeRuntime();
  const job = {
    job_id: "job-status-surfaces",
    status: "running",
    display_stage: "translation",
    substage: "translation_batches",
    progress: {
      unit: "batch",
      current: 28,
      total: 5216,
    },
  };

  const viewModel = buildStatusViewModelForRuntime({
    runtime,
    job,
    jobId: job.job_id,
    events: { items: [] },
    manifest: null,
    stageActions: null,
    publicErrorText: "",
  });

  assert.equal(viewModel.jobId, "job-status-surfaces");
  assert.equal(viewModel.stageKey, "translate");
  assert.equal(viewModel.substageKey, "translation_batches");
  assert.equal(viewModel.progressCurrent, 28);
  assert.equal(viewModel.progressTotal, 5216);
});

test("status surfaces presenter owns secondary patch payload shape", () => {
  const runtime = fakeRuntime();
  const job = {
    job_id: "job-secondary-patch",
    status: "failed",
    failure: {
      summary: "翻译失败",
    },
  };
  const payload = buildSecondaryStatusPatchPayload({
    runtime,
    job,
    jobId: job.job_id,
    events: { items: [] },
    manifest: null,
    stageActions: null,
  });

  assert.equal(payload.job, job);
  assert.equal(payload.jobId, "job-secondary-patch");
  assert.equal(payload.statusViewModel.jobId, "job-secondary-patch");
  assert.equal(payload.stagePresentation, payload.statusViewModel.stagePresentation);
  assert.match(payload.publicErrorText, /翻译失败|任务失败/);
});

test("status surfaces presenter exposes status detail duration options from runtime", () => {
  assert.deepEqual(statusDetailDurationOptionsForRuntime(fakeRuntime()), {
    durationOptions: {
      finishedAtFallback: "2026-01-01T00:04:00Z",
    },
  });
});

test("status surfaces presenter owns secondary patch refresh strategy", () => {
  const runtime = fakeRuntime();
  const calls = [];
  const job = {
    job_id: "job-secondary-render",
    status: "running",
    display_stage: "translation",
    progress: {
      unit: "batch",
      current: 2,
      total: 10,
    },
  };

  renderJobSecondaryStatusPatch({
    runtime,
    source: "manifest",
    renderContext: {
      job,
      jobId: job.job_id,
      events: { items: [] },
      manifest: null,
      stageActions: null,
    },
    refreshStatusCard(payload) {
      calls.push(payload);
      return true;
    },
    updateActions: () => {},
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].stagePresentation.stageKey, "translate");
  assert.equal(calls[0].stagePresentation.progressCurrent, 2);
});
