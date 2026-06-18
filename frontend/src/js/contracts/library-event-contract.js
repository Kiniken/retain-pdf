import { APP_EVENTS } from "./app-contract.js";

export const LIBRARY_REFRESH_MIN_INTERVAL_MS = 4000;

export function normalizeLibraryRefreshDetail(detail = {}) {
  const delay = Number(detail?.delay);
  return {
    delay: Number.isFinite(delay) ? delay : undefined,
    force: Boolean(detail?.force),
  };
}

export function normalizeLibraryJobDetail(detail = {}) {
  return {
    job: detail?.job || null,
  };
}

export function createLibraryEventPort({ target = document } = {}) {
  return {
    requestRefresh({ delay, force = false } = {}) {
      target.dispatchEvent(new CustomEvent(APP_EVENTS.libraryRefreshRequested, {
        detail: {
          delay: Number.isFinite(Number(delay)) ? Number(delay) : undefined,
          force: Boolean(force),
        },
      }));
    },

    publishJobUpdated(job) {
      if (!job) {
        return;
      }
      target.dispatchEvent(new CustomEvent(APP_EVENTS.libraryJobUpdated, {
        detail: { job },
      }));
    },

    publishJobCreated(job) {
      if (!job) {
        return;
      }
      target.dispatchEvent(new CustomEvent(APP_EVENTS.libraryJobCreated, {
        detail: { job },
      }));
    },

    subscribe({
      onRefreshRequested,
      onJobUpdated,
      onJobCreated,
    } = {}) {
      const handlers = [
        [
          APP_EVENTS.libraryRefreshRequested,
          (event) => onRefreshRequested?.(normalizeLibraryRefreshDetail(event.detail)),
        ],
        [
          APP_EVENTS.libraryJobUpdated,
          (event) => onJobUpdated?.(normalizeLibraryJobDetail(event.detail)),
        ],
        [
          APP_EVENTS.libraryJobCreated,
          (event) => onJobCreated?.(normalizeLibraryJobDetail(event.detail)),
        ],
      ];
      handlers.forEach(([eventName, handler]) => {
        target.addEventListener(eventName, handler);
      });
      return {
        destroy() {
          handlers.forEach(([eventName, handler]) => {
            target.removeEventListener(eventName, handler);
          });
        },
      };
    },
  };
}

export function requestThrottledLibraryRefresh(state, {
  port = createLibraryEventPort(),
  terminal = false,
} = {}) {
  const now = Date.now();
  const minInterval = terminal ? 0 : LIBRARY_REFRESH_MIN_INTERVAL_MS;
  if (!terminal && state.lastLibraryRefreshRequestedAt && now - state.lastLibraryRefreshRequestedAt < minInterval) {
    return false;
  }
  state.lastLibraryRefreshRequestedAt = now;
  port.requestRefresh({ delay: terminal ? 200 : 800 });
  return true;
}
