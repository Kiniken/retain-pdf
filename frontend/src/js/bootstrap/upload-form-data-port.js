import { collectUploadFormData } from "../features/upload/form-data.js";

export function createUploadFormDataPort(overrides = {}) {
  return Object.freeze({
    collectUploadFormData,
    ...overrides,
  });
}
