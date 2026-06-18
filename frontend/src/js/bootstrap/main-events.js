import {
  defaultMainEventPort,
} from "./main-event-port.js";
import {
  bindMainFeatureLifecycle,
} from "./main-feature-lifecycle-events.js";
import {
  bindMainShellEvents,
} from "./main-shell-event-bindings.js";

export function bindMainEvents({
  developerFeature,
  glossariesFeature,
  homeFeature,
  artifactDownloadsFeature,
  statusDetailFeature,
  appShellFeature,
  workflowFeature,
  uploadFeature,
  appActionsFeature,
  jobRuntimeFeature,
  state,
  fetchProtected,
  setText,
  eventPort = defaultMainEventPort,
}) {
  bindMainFeatureLifecycle({
    developerFeature,
    glossariesFeature,
    homeFeature,
    artifactDownloadsFeature,
    statusDetailFeature,
    appShellFeature,
  });
  bindMainShellEvents({
    workflowFeature,
    uploadFeature,
    appActionsFeature,
    jobRuntimeFeature,
    statusDetailFeature,
    state,
    fetchProtected,
    setText,
    eventPort,
  });
}
