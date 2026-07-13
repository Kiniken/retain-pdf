export function createRecentJobsReaderPort({
  openReader,
} = {}) {
  return {
    openReader(jobId, anchor = null) {
      const normalizedJobId = `${jobId || ""}`.trim();
      if (!normalizedJobId) {
        return false;
      }
      openReader?.(normalizedJobId, anchor);
      return true;
    },
  };
}
