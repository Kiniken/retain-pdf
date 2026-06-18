import {
  bootstrapStartupRoute,
  initializeIdleAndRecentJobs,
} from "./startup-route.js";

export function initializeStartupFlows({
  features,
  ports,
  initializeIdleAndRecentJobsFn = initializeIdleAndRecentJobs,
  bootstrapStartupRouteFn = bootstrapStartupRoute,
} = {}) {
  initializeIdleAndRecentJobsFn({
    appShellFeature: features.appShellFeature,
    state: ports.state,
    fetchProtected: ports.fetchProtected,
    deleteLibraryBook: ports.deleteLibraryBook,
    fetchJobList: ports.fetchJobList,
    fetchJobPayload: ports.fetchJobPayload,
    fetchLibraryBookList: ports.fetchLibraryBookList,
    jobRuntimeFeature: features.jobRuntimeFeature,
    libraryEventPort: features.libraryEventPort,
    ports,
    setText: ports.setText,
  });
  bootstrapStartupRouteFn({
    state: ports.state,
    fetchProtected: ports.fetchProtected,
    jobRuntimeFeature: features.jobRuntimeFeature,
    ports,
    setText: ports.setText,
  });
}
