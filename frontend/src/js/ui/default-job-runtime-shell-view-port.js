import { createJobRuntimeShellViewPort } from "../features/job-runtime/shell-view-port.js";
import {
  closeRuntimeDialogs,
  isReaderDialogOpen,
  resetEventsList,
  setCancelButtonDisabled,
} from "../features/app-shell/view.js";

export const defaultJobRuntimeShellViewPort = createJobRuntimeShellViewPort({
  closeDialogs: closeRuntimeDialogs,
  isReaderOpen: isReaderDialogOpen,
  resetEvents: resetEventsList,
  setCancelDisabled: setCancelButtonDisabled,
});
