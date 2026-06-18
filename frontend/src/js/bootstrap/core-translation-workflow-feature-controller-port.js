import { mountTranslationWorkflowDialogFeature } from "../features/translation-workflow-dialog/controller.js";

export function createCoreTranslationWorkflowFeatureControllerPort(overrides = {}) {
  return Object.freeze({
    mountTranslationWorkflowDialogFeature,
    ...overrides,
  });
}
