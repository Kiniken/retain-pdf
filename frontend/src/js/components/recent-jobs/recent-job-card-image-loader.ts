import { fetchJobImageBlob, normalizeJobImageUrl } from "../../api/job-images.js";

const recentJobImageCache = new Map();

function cacheKeyForRecentJobImage(url, { cacheVersion = "" } = {}) {
  const version = `${cacheVersion || ""}`.trim();
  return version ? `${url}#${version}` : url;
}

export function normalizeRecentJobImageUrl(value) {
  return normalizeJobImageUrl(value);
}

export function clearRecentJobImageCache(rawUrls) {
  for (const rawUrl of Array.isArray(rawUrls) ? rawUrls : [rawUrls]) {
    const url = normalizeRecentJobImageUrl(rawUrl);
    if (url) {
      recentJobImageCache.delete(url);
    }
  }
}

export async function loadRecentJobImage(rawUrl, options = {}) {
  const url = normalizeRecentJobImageUrl(rawUrl);
  if (!url) {
    return "";
  }
  const cacheKey = cacheKeyForRecentJobImage(url, options);
  if (recentJobImageCache.has(cacheKey)) {
    return recentJobImageCache.get(cacheKey);
  }
  const request = fetchJobImageBlob(rawUrl)
    .then((blob) => URL.createObjectURL(blob))
    .catch((error) => {
      recentJobImageCache.delete(cacheKey);
      throw error;
    });
  recentJobImageCache.set(cacheKey, request);
  return request;
}

export async function loadFirstRecentJobImage(rawUrls, options = {}) {
  for (const rawUrl of Array.isArray(rawUrls) ? rawUrls : [rawUrls]) {
    try {
      const objectUrl = await loadRecentJobImage(rawUrl, options);
      if (objectUrl) {
        return objectUrl;
      }
    } catch {
      // Try the next candidate URL.
    }
  }
  return "";
}
