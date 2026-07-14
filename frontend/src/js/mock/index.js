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

export function getMockJobList({ jobIds = [] } = {}) {
  let items = [buildMockJobPayload()];
  if (Array.isArray(jobIds) && jobIds.length) {
    const wanted = new Set(jobIds.map((id) => `${id}`.trim()).filter(Boolean));
    items = items.filter((item) => wanted.has(item.job_id));
  }
  return {
    items,
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
