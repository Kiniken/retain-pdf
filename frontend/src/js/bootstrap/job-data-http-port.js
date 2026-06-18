import {
  buildJobDetailEndpoint,
  submitJson,
} from "../api/http.js";

export function createJobDataHttpPort(overrides = {}) {
  return Object.freeze({
    buildJobDetailEndpoint,
    submitJson,
    ...overrides,
  });
}
