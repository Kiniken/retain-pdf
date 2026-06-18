import {
  normalizeJobPayload,
} from "../job/normalize.js";
import { createPageRuntime } from "../app-framework/page-runtime.js";
import {
  setDetailActionLink,
  setDetailEventsStatus,
  setDetailText,
} from "./view.js";
import {
  bindEventsLauncher,
  bindStageHistoryLauncher,
} from "./events.js";
import { bindJobDetailProtectedDownloads } from "./downloads.js";
import {
  getJobIdFromQuery,
} from "./routing.js";
import {
  bindRerunButton,
} from "./resume.js";
import { defaultJobDetailConfigPort } from "./config-port.js";
import { defaultJobDetailDataPort } from "./data-port.js";
import { defaultJobDetailResumePort } from "./resume-port.js";
import {
  loadAndRenderMarkdownFlow,
} from "./markdown-flow.js";
import { bindJobDetailModals } from "./modal-bindings.js";
import { renderJobDetailOverview } from "./overview-renderer.js";
import {
  createJobDetailPageState,
  revokeJobDetailMarkdownImageUrls,
} from "./page-state.js";

const detailPageState = createJobDetailPageState();
const detailPageRuntime = createPageRuntime({
  onError(error) {
    setText("detail-head-note", error.message || String(error));
  },
});

function setText(id, value) {
  setDetailText(id, value);
}

function setActionLink(id, url, enabled) {
  setDetailActionLink(id, url, enabled);
}

function setEventsStatus(text) {
  setDetailEventsStatus(text);
}

async function initializePage() {
  bindJobDetailModals({
    onBeforeUnload: () => revokeJobDetailMarkdownImageUrls(detailPageState),
  });
  bindStageHistoryLauncher({ detailPageState });
  bindEventsLauncher({
    apiPrefix: defaultJobDetailDataPort.apiPrefix,
    detailPageState,
    fetchJobEvents: defaultJobDetailDataPort.fetchJobEvents,
  });
  bindRerunButton({
    detailPageState,
    getJobId: getJobIdFromQuery,
    resumePort: defaultJobDetailResumePort,
    setText,
  });
  bindJobDetailProtectedDownloads({
    detailPageState,
    fetchProtected: defaultJobDetailDataPort.fetchProtected,
    setText,
  });
  const jobId = getJobIdFromQuery();
  if (!jobId) {
    setText("detail-head-note", "缺少 job_id，请通过 detail.html?job_id=... 打开。");
    return;
  }
  setText("detail-job-id", jobId);
  setText("detail-head-note", defaultJobDetailConfigPort.detailShareNote());

  const {
    diagnosticsPayload,
    manifestPayload,
    payloadRaw,
    resumePlan,
  } = await defaultJobDetailDataPort.loadOverview(jobId);
  const job = normalizeJobPayload(payloadRaw);
  renderJobDetailOverview({
    diagnosticsPayload,
    job,
    manifestPayload,
    resumePlan,
    setActionLink,
    setEventsStatus,
    setText,
    state: detailPageState,
  });

  await loadAndRenderMarkdownFlow({
    fetchProtected: defaultJobDetailDataPort.fetchProtected,
    job,
    jobId,
    loadMarkdownPayload: defaultJobDetailDataPort.loadMarkdownPayload,
    markdownImageUrls: detailPageState.markdownImageUrls,
    setActionLink,
    setText,
    state: detailPageState,
  });
}

detailPageRuntime.start(initializePage);
