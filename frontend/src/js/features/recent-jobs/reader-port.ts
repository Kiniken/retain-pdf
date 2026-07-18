export function createRecentJobsReaderPort({
  openReader,
}: any = {}) {
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
