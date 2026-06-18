import { invalidateLibraryBooksResource } from "./library-books-resource.js";
import { hydrateCreatedRecentJob } from "./created-job-hydration.js";

export function bindRecentJobsCommandHandlers({
  apiPrefix,
  commandPort,
  fetchJobPayload,
  libraryBooksResource,
  runtimePatches,
  refreshScheduler,
} = {}) {
  return commandPort.subscribe({
    onRefreshRequested: ({ delay, force } = {}) => {
      invalidateLibraryBooksResource(libraryBooksResource);
      refreshScheduler.scheduleRefresh({ delay: Number(delay ?? 600), force });
    },
    onJobUpdated: ({ job } = {}) => {
      invalidateLibraryBooksResource(libraryBooksResource);
      runtimePatches.update(job);
      refreshScheduler.scheduleRefresh({ delay: 300, bypassThrottle: true });
    },
    onJobCreated: ({ job } = {}) => {
      invalidateLibraryBooksResource(libraryBooksResource);
      runtimePatches.insert(job);
      void hydrateCreatedRecentJob({
        job,
        apiPrefix,
        fetchJobPayload,
        runtimePatches,
      });
      refreshScheduler.scheduleRefresh({ delay: 1200, force: true });
    },
  });
}
