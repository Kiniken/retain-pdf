import { mountArtifactDownloadsFeature } from "../features/artifact-downloads/controller.js";
import {
  createDefaultArtifactDownloadsRuntimePort,
} from "./artifact-downloads-runtime-port.js";
import {
  createArtifactDownloadNameResolverPort,
} from "./artifact-download-name-resolver-port.js";

export function createCredentialArtifactDownloadsFeatureControllerPort(overrides = {}) {
  const artifactDownloadsRuntimePort = overrides.artifactDownloadsRuntimePort
    || createDefaultArtifactDownloadsRuntimePort(overrides.runtimePort);
  const artifactDownloadNameResolver = overrides.artifactDownloadNameResolver
    || createArtifactDownloadNameResolverPort(overrides.nameResolverPort);
  return Object.freeze({
    artifactDownloadNameResolver,
    artifactDownloadsRuntimePort,
    mountArtifactDownloadsFeature,
    ...overrides,
  });
}
