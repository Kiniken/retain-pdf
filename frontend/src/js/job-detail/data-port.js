import { API_PREFIX } from "../config/api-constants.js";
import {
  fetchJobArtifactsManifest,
  fetchJobMarkdown,
  fetchJobMarkdownDocument,
} from "../api/jobs-artifacts.js";
import {
  fetchJobDiagnostics,
  fetchResumePlan,
  rerunJob,
  resumeJob,
} from "../api/jobs-actions.js";
import {
  fetchJobEvents,
} from "../api/jobs-events.js";
import {
  fetchJobPayload,
} from "../api/jobs-query.js";
import { fetchProtected } from "../api/http.js";

export function createJobDetailDataPort({
  apiPrefix = API_PREFIX,
  loadJob = fetchJobPayload,
  loadManifest = fetchJobArtifactsManifest,
  loadDiagnostics = fetchJobDiagnostics,
  loadResumePlan = fetchResumePlan,
  loadMarkdownDocument = fetchJobMarkdownDocument,
  loadMarkdown = fetchJobMarkdown,
  loadEvents = fetchJobEvents,
  rerun = rerunJob,
  resume = resumeJob,
  fetchProtectedResource = fetchProtected,
} = {}) {
  async function loadOverview(jobId) {
    const [payloadRaw, manifestPayload, diagnosticsPayload, resumePlan] = await Promise.all([
      loadJob(jobId, apiPrefix),
      loadManifest(jobId, apiPrefix),
      loadDiagnostics(jobId, apiPrefix).catch(() => null),
      loadResumePlan(jobId, apiPrefix).catch(() => null),
    ]);
    return {
      diagnosticsPayload,
      manifestPayload,
      payloadRaw,
      resumePlan,
    };
  }

  async function loadMarkdownPayload(jobId) {
    return await loadMarkdownDocument(jobId, apiPrefix)
      || await loadMarkdown(jobId, apiPrefix);
  }

  return Object.freeze({
    apiPrefix,
    fetchJobEvents: loadEvents,
    fetchProtected: fetchProtectedResource,
    loadMarkdownPayload,
    loadOverview,
    rerunJob: rerun,
    resumeJob: resume,
  });
}

export const defaultJobDetailDataPort = createJobDetailDataPort();
