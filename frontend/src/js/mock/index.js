import { MOCK_JOB_ID } from "./constants.js";
import { buildMockManifest } from "./artifacts.js";
import { buildMockEvents } from "./events.js";
import { buildMockJobPayload } from "./job.js";
import { currentMockScenario } from "./scenario.js";
export { getMockJobMarkdown } from "./markdown.js";
export { fetchMockProtected } from "./responses.js";

export function isMockScenarioEnabled() {
  return !!currentMockScenario();
}

export function getMockScenario() {
  return currentMockScenario();
}

export function getMockJobId() {
  return MOCK_JOB_ID;
}

export function getMockJobPayload(jobId = "") {
  if (jobId && jobId !== MOCK_JOB_ID) {
    throw new Error("未找到该 mock 任务，请检查 job_id 是否正确。");
  }
  return buildMockJobPayload();
}

export function getMockJobEvents() {
  return buildMockEvents();
}

export function getMockJobArtifactsManifest() {
  return buildMockManifest();
}

// 文档中心网格(F2)会用 library/books?job_ids= 批量取"已翻译 mock 文档"的活态。
// 除了 MOCK_JOB_ID 这条完整 payload,其余请求到的 job_id 合成一条"已完成"book,
// 让 mock 模式下已翻译文档卡片有实时状态可展示(馆藏文档无 active_job_id、不会
// 走到这里)。
function synthesizeMockBook(jobId) {
  return {
    id: jobId,
    job_id: jobId,
    title: `${jobId}.pdf`,
    display_name: `${jobId}.pdf`,
    source_file_name: `${jobId}.pdf`,
    page_count: 12,
    status: "succeeded",
    stage: "finished",
    stage_detail: "任务完成",
    progress: { current: 12, total: 12, percent: 100, unit: "none" },
    output_pdf_ready: true,
    markdown_ready: true,
    bundle_ready: true,
    created_at: "2026-06-01T10:00:00Z",
    updated_at: "2026-06-01T12:00:00Z",
  };
}

export function getMockJobList({ jobIds = [] } = {}) {
  if (Array.isArray(jobIds) && jobIds.length) {
    const wanted = jobIds.map((id) => `${id}`.trim()).filter(Boolean);
    const mockJob = buildMockJobPayload();
    const items = wanted.map((id) => (id === MOCK_JOB_ID ? mockJob : synthesizeMockBook(id)));
    return { items, limit: 20, offset: 0, has_more: false };
  }
  return {
    items: [buildMockJobPayload()],
    limit: 20,
    offset: 0,
    has_more: false,
  };
}

export function submitMockJob() {
  return buildMockJobPayload();
}

export function submitMockUpload() {
  return {
    upload_id: "mock-upload-id",
    filename: "mock.pdf",
    page_count: 12,
    bytes: 2_621_440,
  };
}
