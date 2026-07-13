import {
  openReaderDirectly,
} from "./startup-reader-open-flow.js";
import { APP_EVENTS } from "../contracts/app-contract.js";
import { buildErrorDiagnostic } from "../utils/error-diagnostics.js";

export function buildRecentJobsStartupPorts({
  fetchJobPayload,
  fetchProtected,
  jobRuntimeFeature,
  ports,
  setTextFn,
  state,
} = {}) {
  const homeStatePort = ports.createHomeStatePort(state);
  const currentJobPort = ports.createStartupRouteCurrentJobPort?.(state) || {};
  const recentJobsStatePort = ports.createRecentJobsStatePort(state);
  const jobRuntimePort = ports.createRecentJobsRuntimePort({
    openJob: (jobId) => jobRuntimeFeature?.startPolling(jobId),
    currentJobId: () => jobRuntimeFeature?.currentJobId?.() || "",
  });
  const readerPort = ports.createRecentJobsReaderPort({
    openReader: (jobId, anchor = null) => {
      jobRuntimeFeature?.startPolling(jobId);
      void (async () => {
        if (typeof fetchJobPayload === "function") {
          const payload = await fetchJobPayload(jobId, ports.apiPrefix);
          const normalizeJobPayload = ports.jobPresentationPort?.normalizeJobPayload || ((value) => value || {});
          const job = normalizeJobPayload(payload);
          currentJobPort.syncCurrentJobSnapshot?.(job, job.job_id || jobId, {
            startedAt: job.started_at || job.created_at || "",
            finishedAt: job.finished_at || job.updated_at || "",
          });
        }
        await openReaderDirectly({
          state,
          fetchProtected,
          jobId,
          anchor,
          ports,
          setTextFn,
        });
      })().catch((error) => {
        setTextFn("error-box", buildErrorDiagnostic(error, {
          operation: "从最近任务打开阅读器",
          jobId,
          url: globalThis.location?.href,
        }));
      });
    },
  });

  // 库检索岛(React)经契约事件请求打开阅读器,复用同一条 openReader 链
  if (typeof globalThis.document?.addEventListener === "function") {
    globalThis.document.addEventListener(APP_EVENTS.openReaderRequested, (event) => {
      const jobId = `${event?.detail?.jobId || ""}`.trim();
      if (!jobId) {
        return;
      }
      const pageIdx = Number(event?.detail?.pageIdx);
      const blockId = `${event?.detail?.blockId || ""}`.trim();
      const anchor = Number.isFinite(pageIdx) || blockId
        ? { pageIdx: Number.isFinite(pageIdx) ? pageIdx : null, blockId }
        : null;
      readerPort.openReader(jobId, anchor);
    });
  }

  return {
    activeJobRecoveryPort: ports.activeJobRecoveryPort,
    currentJobPort,
    homeStatePort,
    jobRuntimePort,
    readerPort,
    recentJobsStatePort,
  };
}

export function buildRecentJobsStartupMountPayload({
  deleteLibraryBook,
  fetchJobList,
  fetchJobPayload,
  fetchLibraryBookList,
  jobRuntimeFeature,
  libraryEventPort,
  ports,
  startupPorts,
} = {}) {
  return {
    fetchJobList,
    fetchJobPayload,
    fetchLibraryBookList,
    deleteLibraryBook,
    apiPrefix: ports.apiPrefix,
    startPolling: (jobId) => jobRuntimeFeature?.startPolling(jobId),
    currentJobId: () => jobRuntimeFeature?.currentJobId?.() || "",
    activeJobRecoveryPort: startupPorts.activeJobRecoveryPort,
    jobRuntimePort: startupPorts.jobRuntimePort,
    homeStatePort: startupPorts.homeStatePort,
    recentJobsStatePort: startupPorts.recentJobsStatePort,
    libraryRefreshPort: libraryEventPort,
    readerPort: startupPorts.readerPort,
    stageAdapterPort: ports.recentJobsStageAdapterPort,
  };
}
