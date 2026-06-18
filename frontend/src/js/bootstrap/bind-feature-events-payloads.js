export function buildMainEventsBindingPayload({
  features,
  ports,
} = {}) {
  return {
    developerFeature: features.developerFeature,
    glossariesFeature: features.glossariesFeature,
    homeFeature: features.homeFeature,
    artifactDownloadsFeature: features.artifactDownloadsFeature,
    statusDetailFeature: features.statusDetailFeature,
    appShellFeature: features.appShellFeature,
    workflowFeature: features.workflowFeature,
    uploadFeature: features.uploadFeature,
    appActionsFeature: features.appActionsFeature,
    jobRuntimeFeature: features.jobRuntimeFeature,
    state: ports.state,
    fetchProtected: ports.fetchProtected,
    setText: ports.setText,
    eventPort: ports.eventPort,
  };
}
