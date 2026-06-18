export function bindMainFeatureLifecycle({
  developerFeature,
  glossariesFeature,
  homeFeature,
  artifactDownloadsFeature,
  statusDetailFeature,
  appShellFeature,
} = {}) {
  developerFeature?.bindEvents();
  glossariesFeature?.bindEvents();
  homeFeature?.bindEvents();
  artifactDownloadsFeature?.bindEvents();
  statusDetailFeature?.bindEvents();
  appShellFeature?.bindChrome();
}
