import { ensureReaderDialogFeature } from "../features/reader-dialog/entry.js";
import {
  defaultReaderDialogRuntimePort,
} from "./reader-dialog-runtime-port.js";

export function createStartupRouteReaderPort({
  runtimePort = defaultReaderDialogRuntimePort,
  ensureReaderDialogFeature: ensureFeature = ensureReaderDialogFeature,
  ...overrides
} = {}) {
  return Object.freeze({
    readerDialogRuntimePort: runtimePort,
    ensureReaderDialogFeature: (payload = {}) => ensureFeature({
      runtimePort,
      ...payload,
    }),
    ...overrides,
  });
}
