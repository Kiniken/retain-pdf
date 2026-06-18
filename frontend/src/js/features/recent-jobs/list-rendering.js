import { hydrateRecentJobImages } from "./image-hydration.js";
import { bindRecentJobsListEvents } from "./list-events.js";
import { buildRecentJobsMarkup } from "./card-markup.js";
import { recentJobCardMarkup } from "./card-template.js";
import {
  RECENT_JOBS_PRIVATE_KEYS,
  RECENT_JOBS_TAGS,
} from "./dom-contract.js";

export function recentJobCardElement(item) {
  const card = document.createElement(RECENT_JOBS_TAGS.card);
  card.item = item;
  return card;
}

export function bindRecentJobCardEvents(list, { onSelect, onDelete, onReader } = {}) {
  list[RECENT_JOBS_PRIVATE_KEYS.select] = onSelect;
  list[RECENT_JOBS_PRIVATE_KEYS.delete] = onDelete;
  list[RECENT_JOBS_PRIVATE_KEYS.reader] = onReader;
  if (list[RECENT_JOBS_PRIVATE_KEYS.cardBound]) {
    return;
  }
  list[RECENT_JOBS_PRIVATE_KEYS.cardBound] = true;
  list.addEventListener("recent-job-select", (event) => {
    list[RECENT_JOBS_PRIVATE_KEYS.select]?.(event.detail?.jobId || "");
  });
  list.addEventListener("recent-job-delete", (event) => {
    list[RECENT_JOBS_PRIVATE_KEYS.delete]?.(event.detail?.jobId || "");
  });
  list.addEventListener("recent-job-reader", (event) => {
    list[RECENT_JOBS_PRIVATE_KEYS.reader]?.(event.detail?.jobId || "");
  });
}

export function renderRecentJobCardElements(list, items, { reset = false, onSelect, onDelete, onReader } = {}) {
  bindRecentJobCardEvents(list, { onSelect, onDelete, onReader });
  if (reset) {
    list.replaceChildren();
  }
  const fragment = document.createDocumentFragment();
  for (const item of Array.isArray(items) ? items : []) {
    fragment.append(recentJobCardElement(item));
  }
  list.append(fragment);
}

export function buildRecentJobsListMarkup(items) {
  return buildRecentJobsMarkup(items);
}

export function renderRecentJobsMarkupList(list, items, { reset = false, onSelect, onDelete, onReader } = {}) {
  bindRecentJobsListEvents(list, { onSelect, onDelete, onReader });
  const markup = buildRecentJobsMarkup(items);
  list.innerHTML = reset ? markup : `${list.innerHTML}${markup}`;
  hydrateRecentJobImages(list);
  return markup;
}

export function replaceRecentJobCardElement(previous, item, { useCardElement = false } = {}) {
  const next = useCardElement
    ? recentJobCardElement(item)
    : (() => {
      const template = document.createElement("template");
      template.innerHTML = recentJobCardMarkup(item).trim();
      return template.content.firstElementChild;
    })();
  if (!next) {
    return false;
  }
  previous.replaceWith(next);
  if (!useCardElement) {
    hydrateRecentJobImages(next);
  }
  return true;
}
