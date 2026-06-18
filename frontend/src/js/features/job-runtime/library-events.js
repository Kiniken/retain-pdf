import {
  requestThrottledLibraryRefresh,
} from "../../contracts/library-event-contract.js";

const noopLibraryEventPort = Object.freeze({
  publishJobUpdated() {},
  requestRefresh() {},
});

export function requestLibraryRefresh(state, { terminal = false, port = noopLibraryEventPort } = {}) {
  requestThrottledLibraryRefresh(state, { terminal, port });
}

export function notifyLibraryJobUpdated(job, { port = noopLibraryEventPort } = {}) {
  port.publishJobUpdated(job);
}
