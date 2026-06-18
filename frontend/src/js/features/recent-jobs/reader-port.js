export function createRecentJobsReaderPort({
  openReader,
} = {}) {
  return {
    openReader(jobId) {
      const normalizedJobId = `${jobId || ""}`.trim();
      if (!normalizedJobId) {
        return false;
      }
      openReader?.(normalizedJobId);
      return true;
    },
  };
}
