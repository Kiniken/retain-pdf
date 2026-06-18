import { apiBase } from "../config/runtime.js";

export function createArtifactUrlConfigPort({
  resolveApiBase = apiBase,
} = {}) {
  return Object.freeze({
    resolveApiBase,
  });
}

export const defaultArtifactUrlConfigPort = createArtifactUrlConfigPort();
