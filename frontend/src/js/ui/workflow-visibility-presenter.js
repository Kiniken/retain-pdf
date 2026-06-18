import {
  buildJobWarningViewModel,
  buildWorkflowSectionsViewModel,
} from "../job/workflow-visibility-view-model.js";
import {
  setJobWarningVisible,
  setWorkflowSectionsView,
} from "./presentation-view.js";

export function setWorkflowSections(job = null, { onClear = null } = {}) {
  const viewModel = buildWorkflowSectionsViewModel(job);
  setWorkflowSectionsView(viewModel);
  if (!viewModel.hasJob) {
    onClear?.();
  }
}

export function updateJobWarning(status) {
  setJobWarningVisible(buildJobWarningViewModel(status).active);
}
