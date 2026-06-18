import { API_PREFIX } from "../config/api-constants.js";
import {
  fetchJobPayload,
} from "../api/jobs-query.js";
import {
  fetchJobArtifactsManifest,
} from "../api/jobs-artifacts.js";
import { fetchProtected } from "../api/http.js";
import {
  fetchReaderMetadata,
  fetchReaderRegions,
} from "../api/reader.js";
import {
  fetchTranslationItem,
} from "../api/translation-debug.js";

export function createReaderDataPort({
  apiPrefix = API_PREFIX,
  loadJob = fetchJobPayload,
  loadManifest = fetchJobArtifactsManifest,
  loadRegions = fetchReaderRegions,
  loadMetadata = fetchReaderMetadata,
  loadTranslationItem = fetchTranslationItem,
  fetchProtectedResource = fetchProtected,
} = {}) {
  async function loadReaderPayload(jobId) {
    const [jobPayload, manifestPayload, regionsPayload, readerMetadata] = await Promise.all([
      loadJob(jobId, apiPrefix),
      loadManifest(jobId, apiPrefix),
      loadRegions(jobId, apiPrefix).catch(() => ({ items: [] })),
      loadMetadata(jobId, apiPrefix).catch(() => null),
    ]);
    return {
      jobPayload,
      manifestPayload,
      readerMetadata,
      regionsPayload,
    };
  }

  function fetchRegionTranslationItem(jobId, itemId) {
    return loadTranslationItem(jobId, itemId, apiPrefix);
  }

  return Object.freeze({
    apiPrefix,
    fetchProtected: fetchProtectedResource,
    fetchRegionTranslationItem,
    loadReaderPayload,
  });
}

export const defaultReaderDataPort = createReaderDataPort();
