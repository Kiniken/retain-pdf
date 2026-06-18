import {
  dispatchReturnHomeFromStatusArea,
  isStatusAreaVisible,
  setStatusAreaVisible,
} from "../ui/status-area-view.js";
import {
  createTranslationWorkflowStatusAreaPort,
} from "../features/translation-workflow-dialog/status-area-port.js";

export function createCoreTranslationWorkflowStatusAreaPort(overrides = {}) {
  return createTranslationWorkflowStatusAreaPort({
    hide: () => setStatusAreaVisible(false),
    isVisible: isStatusAreaVisible,
    returnHome: dispatchReturnHomeFromStatusArea,
    ...overrides,
  });
}
