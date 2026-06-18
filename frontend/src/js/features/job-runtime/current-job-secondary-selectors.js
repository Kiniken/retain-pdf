import {
  cachedEventsFor,
  cachedManifestFor,
  cachedStageActionsFor,
} from "./secondary-resource-cache.js";

function currentJobId(state) {
  return `${state?.currentJobId || ""}`.trim();
}

export function currentJobManifest(state) {
  return cachedManifestFor(state, currentJobId(state));
}

export function currentJobStageActions(state) {
  return cachedStageActionsFor(state, currentJobId(state));
}

export function currentJobEventsFor(state, jobId) {
  return cachedEventsFor(state, jobId);
}
