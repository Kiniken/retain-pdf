import {
  defaultStartupRoutePorts,
} from "./startup-route-ports.js";
import {
  openReaderDirectly,
} from "./startup-reader-open-flow.js";
import {
  buildRecentJobsStartupMountPayload,
  buildRecentJobsStartupPorts,
} from "./startup-route-recent-jobs-payloads.js";
import { buildErrorDiagnostic } from "../utils/error-diagnostics.js";

export function initializeIdleAndRecentJobs({
  appShellFeature,
  state,
  fetchProtected,
  fetchJobList,
  fetchJobPayload,
  fetchLibraryBookList,
  deleteLibraryBook,
  jobRuntimeFeature,
  libraryEventPort,
  ports = defaultStartupRoutePorts,
  setText: setTextFn = ports.setText,
}) {
  appShellFeature?.initializeIdleView();
  const startupPorts = buildRecentJobsStartupPorts({
    fetchJobPayload,
    fetchProtected,
    jobRuntimeFeature,
    ports,
    setTextFn,
    state,
  });
  ports.mountRecentJobsFeature(
    buildRecentJobsStartupMountPayload({
      deleteLibraryBook,
      fetchJobList,
      fetchJobPayload,
      fetchLibraryBookList,
      jobRuntimeFeature,
      libraryEventPort,
      ports,
      startupPorts,
    }),
  );
}

export function bootstrapStartupRoute({
  state,
  fetchProtected,
  jobRuntimeFeature,
  ports = defaultStartupRoutePorts,
  setText = ports.setText,
}) {
  const startupReaderJobId = ports.getRequestedReaderJobIdFromLocation();
  const startupJobId = startupReaderJobId || ports.getRequestedJobIdFromLocation();
  if (startupJobId) {
    jobRuntimeFeature?.startPolling(startupJobId);
  }
  if (!startupReaderJobId) {
    return;
  }
  ports.setTimeoutFn(async () => {
    try {
      await openReaderDirectly({
        state,
        fetchProtected,
        jobId: startupReaderJobId,
        ports,
        setTextFn: setText,
      });
    } catch (error) {
      setText("error-box", buildErrorDiagnostic(error, {
        operation: "打开阅读器路由",
        jobId: startupReaderJobId,
        url: globalThis.location?.href,
      }));
    }
  }, 0);
}
