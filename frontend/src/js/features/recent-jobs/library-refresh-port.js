import { createLibraryEventPort } from "../../contracts/library-event-contract.js";

export function createRecentJobsLibraryRefreshPort({ target = document } = {}) {
  return createLibraryEventPort({ target });
}
