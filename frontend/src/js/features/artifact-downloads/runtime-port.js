export function createArtifactDownloadsRuntimePort({
  currentJobId = () => "",
} = {}) {
  return Object.freeze({
    currentJobId(state) {
      return `${currentJobId(state) || ""}`.trim();
    },
  });
}
