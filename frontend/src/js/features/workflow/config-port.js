import { isMockMode } from "../../config/runtime.js";

function defaultSearch() {
  return globalThis.window?.location?.search || "";
}

export function resolveMockScenario({
  search = defaultSearch(),
  fallback = "running",
} = {}) {
  return new URLSearchParams(search).get("mock") || fallback;
}

export function createWorkflowConfigPort({
  isMock = isMockMode,
  search = defaultSearch,
} = {}) {
  function mockScenario() {
    return resolveMockScenario({ search: search() });
  }

  return Object.freeze({
    isMock,
    mockScenario,
  });
}

export const defaultWorkflowConfigPort = createWorkflowConfigPort();
