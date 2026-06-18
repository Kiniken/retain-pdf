import { openReaderFromButton } from "../features/reader-dialog/entry.js";
import {
  defaultReaderDialogRuntimePort,
} from "./reader-dialog-runtime-port.js";

export function createDynamicPrimaryActionsReaderPort({
  runtimePort = defaultReaderDialogRuntimePort,
  openReaderFromButton: openReader = openReaderFromButton,
  ...overrides
} = {}) {
  return Object.freeze({
    readerDialogRuntimePort: runtimePort,
    openReaderFromButton: (payload = {}) => openReader({
      runtimePort,
      ...payload,
    }),
    ...overrides,
  });
}
