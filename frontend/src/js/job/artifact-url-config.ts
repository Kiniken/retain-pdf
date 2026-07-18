import { apiBase } from "../config/runtime.js";
import type { ArtifactUrlConfigPortDeps } from "./types.js";

export function createArtifactUrlConfigPort({
  resolveApiBase = apiBase,
}: ArtifactUrlConfigPortDeps = {}) {
  return Object.freeze({
    resolveApiBase,
  });
}

export const defaultArtifactUrlConfigPort = createArtifactUrlConfigPort();
