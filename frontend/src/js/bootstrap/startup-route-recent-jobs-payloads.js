import {
  openReaderDirectly,
} from "./startup-reader-open-flow.js";
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
    openReader: (jobId) => {
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
