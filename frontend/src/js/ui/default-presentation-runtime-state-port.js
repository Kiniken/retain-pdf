import {
  applyJobRuntimeSnapshot,
  applyJobSecondaryResources,
} from "../features/job-runtime/render-context.js";
import {
  currentJobFinishedAt,
  currentJobStoreFor,
} from "../features/job-runtime/current-job-state.js";
import { secondaryResourceStoreFor } from "../features/job-runtime/secondary-resource-cache.js";
import { state } from "../state/store.js";

export const defaultPresentationRuntimeStatePort = Object.freeze({
  applyRuntimeSnapshot: applyJobRuntimeSnapshot,
  applySecondaryResources: applyJobSecondaryResources,
  currentJobStoreFactory: currentJobStoreFor,
  getFinishedAt: currentJobFinishedAt,
  runtimeState: state,
  secondaryResourceStoreFactory: secondaryResourceStoreFor,
});
