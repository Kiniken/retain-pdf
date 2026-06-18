export function createRecentJobsRuntimePort({
  openJob,
  currentJobId = () => "",
} = {}) {
  return {
    currentJobId() {
      return `${currentJobId?.() || ""}`.trim();
    },

    openJob(jobId) {
      const normalizedJobId = `${jobId || ""}`.trim();
      if (!normalizedJobId) {
        return false;
      }
      openJob?.(normalizedJobId);
      return true;
    },
  };
}
