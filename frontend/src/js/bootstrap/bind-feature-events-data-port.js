import { fetchProtected } from "../api/http.js";

export function createBindFeatureEventsDataPort(overrides = {}) {
  return Object.freeze({
    fetchProtected,
    ...overrides,
  });
}
