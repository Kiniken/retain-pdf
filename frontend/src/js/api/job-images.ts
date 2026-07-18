import { API_PREFIX } from "../config/api-constants.js";
import { buildApiHeaders, buildApiUrl } from "../config/runtime.js";

function isFileProtocolRuntime() {
  return typeof window !== "undefined" && window.location?.protocol === "file:";
}

function dedupe(values) {
  const urls = [];
  for (const value of values) {
    const url = `${value || ""}`.trim();
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  }
  return urls;
}

function apiPath(apiPrefix, relativePath) {
  const prefix = `${apiPrefix || API_PREFIX}`.trim().replace(/\/+$/, "");
  const path = `${relativePath || ""}`.trim().replace(/^\/+/, "");
  return `${prefix}/${path}`;
}

function artifactReady(item, ...keys) {
  const artifacts = item?.artifacts && typeof item.artifacts === "object" ? item.artifacts : {};
  const displayItems = Array.isArray(item?.artifacts_display) ? item.artifacts_display : [];
  return keys.some((key) => Boolean(
    item?.[`${key}_ready`]
      || artifacts?.[key]?.ready
      || artifacts?.[`${key}_ready`]
      || displayItems.some((displayItem) => (
        displayItem?.ready && (displayItem?.key === key || displayItem?.kind === key)
      )),
  ));
}

export function buildJobImageCandidateUrls(item: any = {}, { apiPrefix = API_PREFIX } = {}) {
  const jobId = `${item?.job_id || item?.id || ""}`.trim();
  const urls = [
    item?.thumbnail_url,
    item?.cover_url,
  ];
  if (jobId) {
    const encodedJobId = encodeURIComponent(jobId);
    if (artifactReady(item, "thumbnail")) {
      urls.push(
        apiPath(apiPrefix, `jobs/${encodedJobId}/thumbnail`),
        apiPath(apiPrefix, `library/books/${encodedJobId}/thumbnail`),
      );
    }
    if (artifactReady(item, "cover")) {
      urls.push(
        apiPath(apiPrefix, `jobs/${encodedJobId}/cover`),
        apiPath(apiPrefix, `library/books/${encodedJobId}/cover`),
      );
    }
  }
  return dedupe(urls);
}

export function normalizeJobImageUrl(value) {
  const raw = `${value || ""}`.trim();
  if (!raw) {
    return "";
  }
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (parsed.pathname.startsWith("/api/v1/")) {
        const path = `${parsed.pathname}${parsed.search}`;
        return buildApiUrl("", path.replace(/^\/+/, ""));
      }
    } catch {
      return raw;
    }
    return raw;
  }
  if (raw.startsWith("/api/v1/")) {
    return isFileProtocolRuntime() ? buildApiUrl("", raw.replace(/^\/+/, "")) : raw;
  }
  return buildApiUrl("", raw.replace(/^\/+/, ""));
}

export async function fetchJobImageBlob(rawUrl) {
  const url = normalizeJobImageUrl(rawUrl);
  if (!url) {
    return null;
  }
  const response = await fetch(url, { headers: buildApiHeaders() });
  if (!response.ok) {
    throw new Error(`image failed: ${response.status}`);
  }
  return response.blob();
}
