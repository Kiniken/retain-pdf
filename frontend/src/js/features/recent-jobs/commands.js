import { createCommandBus } from "../../app-framework/commands.js";

export const RECENT_JOBS_COMMANDS = Object.freeze({
  refreshRequested: "library:refresh",
  jobUpdated: "library:job-updated",
  jobCreated: "library:job-created",
});

export function createRecentJobsCommandPort({
  commands = createCommandBus(),
} = {}) {
  function requestRefresh(detail = {}) {
    return commands.dispatch(RECENT_JOBS_COMMANDS.refreshRequested, {
      delay: Number.isFinite(Number(detail.delay)) ? Number(detail.delay) : undefined,
      force: Boolean(detail.force),
    });
  }

  function publishJobUpdated(job) {
    if (!job) {
      return Promise.resolve([]);
    }
    return commands.dispatch(RECENT_JOBS_COMMANDS.jobUpdated, { job });
  }

  function publishJobCreated(job) {
    if (!job) {
      return Promise.resolve([]);
    }
    return commands.dispatch(RECENT_JOBS_COMMANDS.jobCreated, { job });
  }

  function subscribe({
    onRefreshRequested,
    onJobUpdated,
    onJobCreated,
  } = {}) {
    const unsubscribers = [
      commands.on(RECENT_JOBS_COMMANDS.refreshRequested, (payload) => onRefreshRequested?.(payload)),
      commands.on(RECENT_JOBS_COMMANDS.jobUpdated, (payload) => onJobUpdated?.(payload)),
      commands.on(RECENT_JOBS_COMMANDS.jobCreated, (payload) => onJobCreated?.(payload)),
    ];
    return {
      destroy() {
        unsubscribers.forEach((unsubscribe) => unsubscribe());
      },
    };
  }

  return Object.freeze({
    commands,
    publishJobCreated,
    publishJobUpdated,
    requestRefresh,
    subscribe,
  });
}
