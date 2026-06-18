import {
  fetchJobList,
  fetchJobPayload,
} from "../api/jobs-query.js";
import {
  deleteLibraryBook,
  fetchLibraryBookList,
} from "../api/library-books.js";

export function createAppInitializerDataJobsPort(overrides = {}) {
  return Object.freeze({
    deleteLibraryBook,
    fetchJobList,
    fetchJobPayload,
    fetchLibraryBookList,
    ...overrides,
  });
}
