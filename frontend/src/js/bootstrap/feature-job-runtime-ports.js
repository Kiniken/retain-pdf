export function createJobRuntimePorts(features) {
  return {
    getJobRuntimeFeature: () => features.jobRuntimeFeature,
    startJobPolling: (jobId) => features.jobRuntimeFeature?.startPolling?.(jobId),
  };
}
