import { createLibraryEventPort } from "../../contracts/library-event-contract.js";

export function createRecentJobsLibraryRefreshPort({ target = document }: any = {}) {
  return createLibraryEventPort({ target });
}
