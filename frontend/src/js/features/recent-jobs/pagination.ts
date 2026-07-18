import { flattenStageSnapshot } from "../../job/stage-snapshot-flatten.js";

export const RECENT_JOBS_PAGE_SIZE = 24;

export function dedupeRecentJobs(items) {
  const seen = new Set();
  const result = [];
  for (const item of Array.isArray(items) ? items : []) {
    const jobId = `${item?.job_id || ""}`.trim();
    if (!jobId || seen.has(jobId)) {
      continue;
    }
    seen.add(jobId);
    result.push(item);
  }
  return result;
}

export function isPrimaryRecentJob(item) {
  const workflow = `${item?.workflow || item?.job_type || ""}`.trim();
  const jobId = `${item?.job_id || ""}`.trim();
  if (workflow === "ocr") {
    return false;
  }
  if (jobId.endsWith("-ocr")) {
    return false;
  }
  return true;
}

export async function collectRecentJobsPage({
  fetchJobList,
  fetchLibraryBookList,
  apiPrefix,
  startOffset,
  pageSize,
  existingJobIds = new Set(),
  query = "",
}: any) {
  const fetchLimit = Math.max(pageSize, 20);
  const collected = [];
  const seenJobIds = new Set(existingJobIds);
  let latestInvocationSummary = null;
  let nextOffset = startOffset;
  let hasMore = true;
  let requestCount = 0;

  while (collected.length < pageSize) {
    requestCount += 1;
    let payload = null;
    if (fetchJobList) {
      payload = await fetchJobList(apiPrefix, { limit: fetchLimit, offset: nextOffset, q: query });
    } else if (fetchLibraryBookList) {
      payload = await fetchLibraryBookList(apiPrefix, { limit: fetchLimit, offset: nextOffset, q: query });
    }
    latestInvocationSummary = payload?.invocation_summary || latestInvocationSummary;
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const pageHasMore = payload?.has_more;
    if (items.length === 0) {
      hasMore = false;
      break;
    }

    const beforeCount = collected.length;
    for (const item of items) {
      if (!isPrimaryRecentJob(item)) {
        continue;
      }
      const jobId = `${item?.job_id || ""}`.trim();
      if (!jobId || seenJobIds.has(jobId)) {
        continue;
      }
      seenJobIds.add(jobId);
      collected.push(flattenStageSnapshot(item));
      if (collected.length >= pageSize) {
        break;
      }
    }

    nextOffset += fetchLimit;

    if (pageHasMore === false || items.length < fetchLimit) {
      hasMore = false;
      break;
    }
    if (!hasMore || collected.length >= pageSize) {
      break;
    }
    if (collected.length === beforeCount || requestCount >= 12) {
      hasMore = false;
      break;
    }
  }

  return {
    collected,
    hasMore,
    latestInvocationSummary,
    nextOffset,
  };
}
