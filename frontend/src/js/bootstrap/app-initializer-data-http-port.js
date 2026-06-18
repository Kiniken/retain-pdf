import { fetchProtected } from "../api/http.js";

export function createAppInitializerDataHttpPort(overrides = {}) {
  return Object.freeze({
    fetchProtected,
    ...overrides,
  });
}
