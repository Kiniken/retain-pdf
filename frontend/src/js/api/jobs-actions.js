import { buildApiHeaders, isMockMode } from "../config/runtime.js";
import { unwrapEnvelope } from "../job/core.js";
import { currentMockScenario } from "../mock/scenario.js";
import { buildJobDetailEndpoint, submitJson } from "./http.js";

export async function fetchJobDiagnostics(jobId, apiPrefix) {
  if (isMockMode()) {
    // 与 mock/job.js 的 failure 字段保持同源,避免详情弹窗(读 job.failure)
    // 与 detail 页(读本端点)在 mock 下显示不一致
    if (currentMockScenario() !== "failed") {
      return null;
    }
    return {
      job_id: jobId,
      summary: "任务失败，但这是前端 mock 场景。",
      category: "mock_render_failure",
      failed_stage: "render",
      root_cause: "用于 UI 调试的模拟失败。",
      suggestion: "切换 ?mock=succeeded 查看成功态。",
      detail: "",
      retryable: true,
      resume_available: true,
    };
  }
  const resp = await fetch(`${buildJobDetailEndpoint(jobId, apiPrefix)}/diagnostics`, {
    headers: buildApiHeaders(),
  });
  if (!resp.ok) {
    if (resp.status === 404) {
      return null;
    }
    throw new Error(`读取失败诊断失败，请稍后重试。(${resp.status})`);
  }
  return unwrapEnvelope(await resp.json());
}

export async function fetchResumePlan(jobId, apiPrefix) {
  if (isMockMode()) {
    return {
      job_id: jobId,
      can_resume: true,
      from_stage: "render",
      resume_workflow: "render",
      reuses_artifacts: ["translations_dir", "source_pdf"],
      reruns_stages: ["render"],
      reason: "mock resume plan",
    };
  }
  const resp = await fetch(`${buildJobDetailEndpoint(jobId, apiPrefix)}/resume-plan`, {
    headers: buildApiHeaders(),
  });
  if (!resp.ok) {
    if (resp.status === 404) {
      return null;
    }
    throw new Error(`读取恢复计划失败，请稍后重试。(${resp.status})`);
  }
  return unwrapEnvelope(await resp.json());
}

export async function resumeJob(jobId, apiPrefix) {
  if (isMockMode()) {
    return {
      job_id: `mock-resume-${Date.now()}`,
      status: "queued",
    };
  }
  return submitJson(`${buildJobDetailEndpoint(jobId, apiPrefix)}/resume`, {});
}

export async function fetchJobStageActions(jobId, apiPrefix) {
  if (isMockMode()) {
    return {
      job_id: jobId,
      stages: [
        { stage: "ocr", label: "重试 OCR", can_retry: false, disabled_reason: "Mock 任务不支持 OCR 重试" },
        { stage: "translation", label: "重试翻译", can_retry: true, disabled_reason: "" },
        { stage: "render", label: "重新渲染", can_retry: true, disabled_reason: "" },
      ],
    };
  }
  const resp = await fetch(`${buildJobDetailEndpoint(jobId, apiPrefix)}/stage-actions`, {
    headers: buildApiHeaders(),
  });
  if (!resp.ok) {
    if (resp.status === 404) {
      return null;
    }
    throw new Error(`读取阶段操作失败，请稍后重试。(${resp.status})`);
  }
  return unwrapEnvelope(await resp.json());
}

export async function retryJobStage(jobId, apiPrefix, stage, payload = {}) {
  const normalizedStage = `${stage || ""}`.trim();
  if (!normalizedStage) {
    throw new Error("阶段重试失败: 缺少 stage");
  }
  if (isMockMode()) {
    return {
      job_id: `mock-${normalizedStage}-retry-${Date.now()}`,
      source_job_id: jobId,
      status: "queued",
      rerun_from_stage: normalizedStage,
    };
  }
  return submitJson(`${buildJobDetailEndpoint(jobId, apiPrefix)}/retry-stage`, {
    stage: normalizedStage,
    ...payload,
  });
}

export async function rerunJob(actionUrl) {
  if (isMockMode()) {
    void actionUrl;
    return {
      job_id: `mock-rerun-${Date.now()}`,
      status: "queued",
    };
  }
  return submitJson(actionUrl, {});
}
